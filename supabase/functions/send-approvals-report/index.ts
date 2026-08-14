// On-demand step (not agentic — same steps every time): builds the full
// approvals report, every expense across every status, and emails it as a
// CSV attachment to whichever board/treasurer user clicked the button on
// the Approvals page. The recipient is taken from the caller's verified
// Supabase session, not from the request body, so someone can't ask this
// function to email the report to an arbitrary address.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const REPORT_FROM_EMAIL = Deno.env.get('REPORT_FROM_EMAIL')!;

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

const REPORT_COLUMNS = [
  'Date',
  'Item',
  'Submitted by',
  'Category',
  'Amount',
  'Status',
  'Reviewed by',
  'Review reason',
  'Denial reason',
];

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

interface ExpenseRow {
  expense_date: string;
  items_purchased: string[] | null;
  requester_name: string;
  category: string;
  amount: number;
  status: string;
  reviewed_by: string | null;
  review_reason: string | null;
  denial_reason: string | null;
}

function expensesToCsv(expenses: ExpenseRow[]): string {
  const rows = expenses.map((e) => [
    e.expense_date,
    (e.items_purchased ?? []).join('; '),
    e.requester_name,
    e.category,
    Number(e.amount).toFixed(2),
    e.status,
    e.reviewed_by ?? '',
    e.review_reason ?? '',
    e.denial_reason ?? '',
  ]);

  return [REPORT_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

function toBase64(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(jwt);

  if (userError || !userData.user?.email) {
    return new Response(JSON.stringify({ error: 'You must be signed in to email a report.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const recipientEmail = userData.user.email;

  const { data: expenses, error: expensesError } = await serviceClient
    .from('expenses')
    .select('expense_date, items_purchased, requester_name, category, amount, status, reviewed_by, review_reason, denial_reason')
    .order('expense_date', { ascending: false });

  if (expensesError) {
    console.error('Failed to load expenses for report:', expensesError);
    return new Response(JSON.stringify({ error: 'Failed to load expenses' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const csv = expensesToCsv(expenses ?? []);

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: REPORT_FROM_EMAIL,
      to: recipientEmail,
      subject: 'St. Croix Valley Bird Club — Full approvals report',
      text: `Attached is the full expense approvals report: ${expenses?.length ?? 0} expenses across every status (pending, needs board, approved, rejected).`,
      attachments: [
        {
          filename: 'approvals-report.csv',
          content: toBase64(csv),
        },
      ],
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text();
    console.error('Resend send failed:', detail);
    return new Response(JSON.stringify({ error: 'Failed to send the report email' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: logError } = await serviceClient.from('report_downloads').insert({
    year: null,
    expense_count: expenses?.length ?? 0,
    channel: 'email',
    recipient_email: recipientEmail,
  });
  if (logError) console.error('Failed to log report email:', logError);

  return new Response(JSON.stringify({ ok: true, sentTo: recipientEmail }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
