import { Nav } from '../components/Nav';

export function Approvals() {
  return (
    <div className="page">
      <Nav />

      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">Treasurer / board sign-off queue</p>
        </div>
      </div>

      <div className="placeholder-panel">
        This screen wasn't part of the design handoff — the treasurer's approval queue was designed
        separately. Request that design to build this out; for now it's a placeholder so the nav
        stays complete.
      </div>
    </div>
  );
}
