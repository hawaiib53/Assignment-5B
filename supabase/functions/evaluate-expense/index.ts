// Agentic review step: Claude decides whether a submitted expense should be
// routed to normal processing ("pending") or flagged for board review
// ("needs_board"), based on the club's spending limit and its own judgment
// about whether the item/service is unusual. Runs server-side so the
// Anthropic API key never reaches the browser.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.71.0';

const REVIEW_AMOUNT_THRESHOLD = 300;
const AUTO_APPROVE_THRESHOLD = 50;

// Supabase Edge Functions don't add CORS headers on their own — without
// these, every call from the browser (a different origin than the function)
// is blocked by the browser before it even reaches this code.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const FLAG_TOOL: Anthropic.Tool = {
  name: 'flag_expense_review',
  description:
    'Record the decision on whether this expense needs board review before it can be treated as routine.',
  input_schema: {
    type: 'object',
    properties: {
      needs_review: {
        type: 'boolean',
        description: 'True if the expense should be flagged for board review instead of routine processing.',
      },
      reason: {
        type: 'string',
        description: "One sentence explaining the decision, written for the treasurer/board to read.",
      },
    },
    required: ['needs_review', 'reason'],
    additionalProperties: false,
  },
  strict: true,
};

interface EvaluationInput {
  itemDescription: string;
  category: string;
  amount: number;
  notes?: string;
}

async function evaluateExpense(input: EvaluationInput): Promise<{ needsReview: boolean; reason: string }> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system:
        `You screen expense reimbursement requests for a small nonprofit bird club. Decide whether an ` +
        `expense can be auto-cleared for normal processing, or should be flagged for board review.\n\n` +
        `Flag for review when either is true:\n` +
        `- The amount is greater than $${REVIEW_AMOUNT_THRESHOLD}.\n` +
        `- The item or service purchased is unusual for a bird club — anything that doesn't clearly fit ` +
        `typical speaker fees, event supplies, or donations (e.g. equipment, travel, gifts, anything that ` +
        `reads as personal or hard to justify as club business).\n\n` +
        `Do not flag routine small purchases just because the wording is slightly unusual (e.g. "suet cakes" ` +
        `or "raffle prize" are normal for a bird club). When in doubt on a borderline unusual item under the ` +
        `dollar threshold, prefer not flagging it.`,
      tools: [FLAG_TOOL],
      tool_choice: { type: 'tool', name: 'flag_expense_review' },
      messages: [
        {
          role: 'user',
          content:
            `Category: ${input.category}\n` +
            `Amount: $${input.amount.toFixed(2)}\n` +
            `Item/service: ${input.itemDescription}\n` +
            `Notes: ${input.notes || '(none)'}`,
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) throw new Error('Claude did not return a flag_expense_review tool call');

    const { needs_review, reason } = toolUse.input as { needs_review: boolean; reason: string };
    return { needsReview: needs_review, reason };
  } catch (err) {
    console.error('Expense review evaluation failed, defaulting to board review:', err);
    return {
      needsReview: true,
      reason: 'Automatic review was unavailable, so this was routed to the board as a precaution.',
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { requesterName, itemDescription, category, amount, expenseDate, notes, receiptPath } = body as {
    requesterName?: string;
    itemDescription?: string;
    category?: string;
    amount?: number;
    expenseDate?: string;
    notes?: string;
    receiptPath?: string | null;
  };

  if (!requesterName || !itemDescription || !category || !amount || amount <= 0 || !expenseDate) {
    return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { needsReview, reason: claudeReason } = await evaluateExpense({ itemDescription, category, amount, notes });

  let status: 'pending' | 'needs_board' | 'approved';
  let reviewReason: string;

  if (needsReview) {
    status = 'needs_board';
    reviewReason = claudeReason;
  } else if (amount < AUTO_APPROVE_THRESHOLD) {
    status = 'approved';
    reviewReason = `Auto-approved: under the $${AUTO_APPROVE_THRESHOLD} threshold and not flagged as unusual.`;
  } else {
    status = 'pending';
    reviewReason = claudeReason;
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      requester_name: requesterName,
      amount,
      expense_date: expenseDate,
      items_purchased: [itemDescription],
      justification: notes || null,
      category,
      status,
      review_reason: reviewReason,
      receipt_path: receiptPath ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert expense:', error);
    return new Response(JSON.stringify({ error: 'Failed to save expense' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
