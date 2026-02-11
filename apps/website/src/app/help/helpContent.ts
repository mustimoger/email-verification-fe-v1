export const helpStyles = String.raw`/* ============================================
     BOLTROUTE HELP CENTER STYLES
     Matches boltroute.ai design system
     ============================================ */
  
  .br-help-center {
    font-family: var(--font-help-inter), -apple-system, BlinkMacSystemFont, sans-serif;
    color: #6c6c6c;
    line-height: 1.7;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  .br-help-center * {
    box-sizing: border-box;
  }
  
  /* Typography */
  .br-help-center h1,
  .br-help-center h2,
  .br-help-center h3,
  .br-help-center h4 {
    font-family: var(--font-help-work), var(--font-help-inter), sans-serif;
    color: #1b1b20;
    font-weight: 700;
    line-height: 1.3;
    margin-top: 0;
  }
  
  .br-help-center h1 {
    font-size: 42px;
    margin-bottom: 20px;
  }
  
  .br-help-center h2 {
    font-size: 32px;
    margin-bottom: 16px;
    padding-top: 40px;
  }
  
  .br-help-center h3 {
    font-size: 24px;
    margin-bottom: 12px;
    padding-top: 24px;
  }
  
  .br-help-center h4 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  .br-help-center p {
    margin-bottom: 16px;
    font-size: 16px;
  }
  
  .br-help-center a {
    color: #1b1b20;
    text-decoration: underline;
    text-decoration-color: #ffd000;
    text-underline-offset: 3px;
    transition: all 0.2s ease;
  }
  
  .br-help-center a:hover {
    color: #ffd000;
    text-decoration-color: #1b1b20;
  }
  
  /* Quick Links Grid */
  .br-quick-links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 60px;
  }
  
  .br-quick-link {
    background: #ffffff;
    border: 1px solid #ededed;
    border-radius: 16px;
    padding: 24px;
    text-decoration: none !important;
    transition: all 0.3s ease;
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  
  .br-quick-link:hover {
    border-color: #ffd000;
    box-shadow: 0 8px 30px rgba(255, 208, 0, 0.15);
    transform: translateY(-2px);
  }
  
  .br-quick-link-icon {
    width: 48px;
    height: 48px;
    background: #fffced;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 24px;
  }
  
  .br-quick-link-content h4 {
    margin: 0 0 4px;
    padding: 0;
    font-size: 16px;
  }
  
  .br-quick-link-content p {
    margin: 0;
    font-size: 14px;
    color: #6c6c6c;
  }
  
  /* Table of Contents */
  .br-toc {
    background: #f9f9f8;
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 60px;
  }
  
  .br-toc h3 {
    padding-top: 0;
    margin-bottom: 20px;
    font-size: 20px;
  }
  
  .br-toc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px 32px;
  }
  
  .br-toc a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    font-size: 15px;
    color: #6c6c6c;
    text-decoration: none !important;
    border-bottom: 1px solid transparent;
  }
  
  .br-toc a::before {
    content: '→';
    color: #ffd000;
    font-weight: 600;
  }
  
  .br-toc a:hover {
    color: #1b1b20;
  }
  
  /* Content Sections */
  .br-section {
    margin-bottom: 60px;
    scroll-margin-top: 100px;
  }
  
  .br-section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #ededed;
  }
  
  .br-section-icon {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #fffced 0%, #fff3c1 100%);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
  }
  
  .br-section-header h2 {
    margin: 0;
    padding: 0;
  }
  
  /* Cards */
  .br-card {
    background: #ffffff;
    border: 1px solid #ededed;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
  }
  
  .br-card-highlight {
    background: linear-gradient(135deg, #fffced 0%, #ffffff 100%);
    border-color: #ffd000;
  }
  
  .br-card h4 {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 0;
  }
  
  .br-card h4::before {
    content: '●';
    color: #ffd000;
    font-size: 10px;
  }
  
  /* Steps */
  .br-steps {
    counter-reset: step-counter;
  }
  
  .br-step {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
    padding: 20px;
    background: #f9f9f8;
    border-radius: 12px;
    position: relative;
  }
  
  .br-step::before {
    counter-increment: step-counter;
    content: counter(step-counter);
    width: 36px;
    height: 36px;
    background: #ffd000;
    color: #1b1b20;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
  }
  
  .br-step-content {
    flex: 1;
  }
  
  .br-step-content p:last-child {
    margin-bottom: 0;
  }
  
  /* Tables */
  .br-table-wrapper {
    overflow-x: auto;
    margin: 24px 0;
    border-radius: 12px;
    border: 1px solid #ededed;
  }
  
  .br-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  
  .br-table th {
    background: #f9f9f8;
    color: #1b1b20;
    font-weight: 600;
    text-align: left;
    padding: 14px 16px;
    border-bottom: 2px solid #ededed;
    font-family: var(--font-help-work), sans-serif;
  }
  
  .br-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #ededed;
    vertical-align: top;
  }
  
  .br-table tr:last-child td {
    border-bottom: none;
  }
  
  .br-table tr:hover td {
    background: #fffced;
  }

  /* Volume Pricing */
  .br-volume-pricing {
    background: #f1f3f7;
    border: 1px solid #d8dde6;
    border-radius: 24px;
    padding: 32px 24px;
    margin: 24px 0;
  }

  .br-volume-pricing h4 {
    margin: 0 0 6px;
    padding: 0;
    font-size: 38px;
    line-height: 1.1;
    color: #0b1a3a;
  }

  .br-volume-pricing h4::before {
    display: none;
  }

  .br-volume-subtitle {
    margin: 0;
    color: #98a3b8;
    font-size: 15px;
    font-weight: 500;
  }

  .br-volume-grid {
    margin-top: 22px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .br-volume-item {
    background: #ffffff;
    border: 1px solid #d8dde6;
    border-radius: 14px;
    padding: 14px 12px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .br-volume-tier {
    margin: 0;
    color: #98a3b8;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.2;
  }

  .br-volume-price {
    margin: 6px 0 4px;
    color: #0b1a3a;
    font-family: var(--font-help-work), var(--font-help-inter), sans-serif;
    font-size: 38px;
    font-weight: 600;
    line-height: 1.1;
  }

  .br-volume-rate {
    margin: 0;
    color: #8d99af;
    font-size: 14px;
    line-height: 1.2;
  }
  
  /* Status Badges */
  .br-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 50px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .br-status-valid {
    background: #e8f5e9;
    color: #2e7d32;
  }
  
  .br-status-invalid {
    background: #ffebee;
    color: #c62828;
  }
  
  .br-status-catchall {
    background: #fff3e0;
    color: #ef6c00;
  }
  
  .br-status-unknown {
    background: #f5f5f5;
    color: #616161;
  }
  
  .br-status-processing {
    background: #e3f2fd;
    color: #1565c0;
  }
  
  .br-status-completed {
    background: #e8f5e9;
    color: #2e7d32;
  }
  
  /* Yes/No badges */
  .br-badge-yes {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .br-badge-no {
    background: #f5f5f5;
    color: #616161;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
  }
  
  /* Alert/Callout Boxes */
  .br-callout {
    padding: 20px 24px;
    border-radius: 12px;
    margin: 24px 0;
    display: flex;
    gap: 16px;
  }
  
  .br-callout-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .br-callout-content p:last-child {
    margin-bottom: 0;
  }
  
  .br-callout-warning {
    background: #fff3e0;
    border-left: 4px solid #ffa742;
  }
  
  .br-callout-info {
    background: #e3f2fd;
    border-left: 4px solid #1976d2;
  }
  
  .br-callout-success {
    background: #e8f5e9;
    border-left: 4px solid #43a047;
  }
  
  .br-callout-tip {
    background: #fffced;
    border-left: 4px solid #ffd000;
  }
  
  /* Code/Inline Code */
  .br-code {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 14px;
    color: #1b1b20;
  }
  
  /* Screenshots */
  .br-screenshot {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 14px;
    margin: 24px 0;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }
  
  .br-screenshot img {
    width: 100%;
    height: auto;
    display: block;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
  }
  
  .br-screenshot p {
    margin: 10px 0 0;
    color: #4b5563;
    font-size: 13px;
    line-height: 1.5;
    text-align: center;
  }
  
  /* Video Placeholder */
  .br-video {
    background: #1b1b20;
    border-radius: 16px;
    padding: 80px 40px;
    text-align: center;
    margin: 24px 0;
    position: relative;
  }
  
  .br-video-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ff4444;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .br-video p {
    margin: 16px 0 0;
    color: #888888;
    font-size: 14px;
  }
  
  .br-video-play {
    width: 72px;
    height: 72px;
    background: #ffd000;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 20px auto 0;
    font-size: 32px;
    color: #1b1b20;
  }
  
  /* Integration Cards Grid */
  .br-integration-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin: 24px 0;
  }
  
  .br-integration-card {
    background: #ffffff;
    border: 1px solid #ededed;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s ease;
  }
  
  .br-integration-card:hover {
    border-color: #ffd000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  
  .br-integration-logo {
    width: 48px;
    height: 48px;
    background: #f9f9f8;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .br-integration-info h4 {
    margin: 0;
    padding: 0;
    font-size: 16px;
  }
  
  .br-integration-info h4::before {
    display: none;
  }
  
  .br-integration-info p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #6c6c6c;
  }

  /* CTA Section */
  .br-cta {
    background: linear-gradient(135deg, #1b1b20 0%, #36363d 100%);
    border-radius: 24px;
    padding: 60px 40px;
    text-align: center;
    margin: 60px 0;
    position: relative;
    overflow: hidden;
  }
  
  .br-cta::before {
    content: '';
    position: absolute;
    top: -100px;
    right: -100px;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(255, 208, 0, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }
  
  .br-cta h3 {
    color: #ffffff;
    font-size: 32px;
    margin-bottom: 12px;
    padding-top: 0;
    position: relative;
  }
  
  .br-cta p {
    color: #a0a0a0;
    font-size: 18px;
    margin-bottom: 32px;
    position: relative;
  }
  
  .br-cta-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
    position: relative;
  }
  
  .br-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 16px;
    text-decoration: none !important;
    transition: all 0.3s ease;
    font-family: var(--font-help-work), sans-serif;
  }
  
  .br-btn-primary {
    background: #ffd000;
    color: #1b1b20 !important;
  }
  
  .br-btn-primary:hover {
    background: #ffe369;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 208, 0, 0.3);
  }
  
  .br-btn-secondary {
    background: transparent;
    color: #ffffff !important;
    border: 2px solid #5b5b65;
  }
  
  .br-btn-secondary:hover {
    border-color: #ffd000;
    color: #ffd000 !important;
  }
  
  /* Resources Grid */
  .br-resources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin: 24px 0;
  }
  
  .br-resource-card {
    background: #f9f9f8;
    border-radius: 12px;
    padding: 24px;
    text-decoration: none !important;
    transition: all 0.2s ease;
  }
  
  .br-resource-card:hover {
    background: #fffced;
  }
  
  .br-resource-card h4 {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .br-resource-card p {
    margin: 0;
    font-size: 14px;
  }

  @media (max-width: 1200px) {
    .br-volume-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .br-volume-pricing h4 {
      font-size: 34px;
    }

    .br-volume-price {
      font-size: 34px;
    }
  }

  @media (max-width: 980px) {
    .br-volume-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .br-volume-pricing h4 {
      font-size: 32px;
    }

    .br-volume-price {
      font-size: 32px;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .br-section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .br-step {
      flex-direction: column;
      gap: 12px;
    }
    
    .br-cta {
      padding: 40px 24px;
    }
    
    .br-cta h3 {
      font-size: 24px;
    }
    
    .br-toc-grid {
      grid-template-columns: 1fr;
    }

    .br-volume-pricing {
      padding: 24px 16px;
      border-radius: 16px;
    }

    .br-volume-pricing h4 {
      font-size: 30px;
    }

    .br-volume-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .br-volume-tier {
      font-size: 14px;
    }

    .br-volume-price {
      font-size: 30px;
    }

    .br-volume-rate {
      font-size: 12px;
    }
  }`;

export const helpHtml = String.raw`<div class="br-help-center">

  <!-- ========================================
       QUICK LINKS
       ======================================== -->
  <section class="br-quick-links">
    <a href="#getting-started" class="br-quick-link">
      <div class="br-quick-link-icon">🚀</div>
      <div class="br-quick-link-content">
        <h4>Getting Started</h4>
        <p>Create account, first verification</p>
      </div>
    </a>
    <a href="#verify-emails" class="br-quick-link">
      <div class="br-quick-link-icon">✉️</div>
      <div class="br-quick-link-content">
        <h4>Verify Emails</h4>
        <p>Manual &#038; bulk verification</p>
      </div>
    </a>
    <a href="#understanding-results" class="br-quick-link">
      <div class="br-quick-link-icon">📊</div>
      <div class="br-quick-link-content">
        <h4>Understanding Results</h4>
        <p>Valid, Invalid, Catch-all explained</p>
      </div>
    </a>
    <a href="#integrations" class="br-quick-link">
      <div class="br-quick-link-icon">🔗</div>
      <div class="br-quick-link-content">
        <h4>Integrations</h4>
        <p>Zapier, Make, n8n, Google Sheets</p>
      </div>
    </a>
    <a href="#api-keys" class="br-quick-link">
      <div class="br-quick-link-icon">🔑</div>
      <div class="br-quick-link-content">
        <h4>API Keys</h4>
        <p>Generate and manage keys</p>
      </div>
    </a>
    <a href="#billing" class="br-quick-link">
      <div class="br-quick-link-icon">💳</div>
      <div class="br-quick-link-content">
        <h4>Credits &#038; Billing</h4>
        <p>Pricing, credits, purchases</p>
      </div>
    </a>
  </section>

  <!-- ========================================
       TABLE OF CONTENTS
       ======================================== -->
  <nav class="br-toc">
    <h3>On This Page</h3>
    <div class="br-toc-grid">
      <a href="#getting-started">Getting Started</a>
      <a href="#dashboard-overview">Dashboard Overview</a>
      <a href="#verify-emails">Verifying Emails</a>
      <a href="#manual-verification">Manual Verification</a>
      <a href="#bulk-upload">Bulk Upload</a>
      <a href="#understanding-results">Understanding Results</a>
      <a href="#history">History &#038; Downloads</a>
      <a href="#integrations">Integrations</a>
      <a href="#api-keys">API Keys</a>
      <a href="#billing">Credits &#038; Billing</a>
      <a href="#account">Account Settings</a>
      <a href="#troubleshooting">Troubleshooting</a>
</div>
  </nav>

  <!-- ========================================
       GETTING STARTED
       ======================================== -->
  <section id="getting-started" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">🚀</div>
      <h2>Getting Started</h2>
    </div>
    
    <h3>Creating Your Account</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Go to the signup page</strong><br>Visit <a href="https://app.boltroute.ai/signup" target="_blank" rel="noopener noreferrer">app.boltroute.ai/signup</a> and enter your email address and create a password.</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Verify your email</strong><br>Check your inbox for a confirmation link. Click it to activate your account.</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Log in and start verifying</strong><br>Access your dashboard at <a href="https://app.boltroute.ai" target="_blank" rel="noopener noreferrer">app.boltroute.ai</a>. New accounts receive free credits—no credit card required.</p>
        </div>
      </div>
    </div>

    <!-- VIDEO PLACEHOLDER -->
    <div class="br-video">
      <div class="br-video-label">📹 REPLACE WITH VIDEO</div>
      <p>Getting Started Tutorial Video<br><em>Recommended: 1-2 minute walkthrough of signup and first verification</em></p>
      <div class="br-video-play">▶</div>
    </div>
  </section>

  <!-- ========================================
       DASHBOARD OVERVIEW
       ======================================== -->
  <section id="dashboard-overview" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">📱</div>
      <h2>Dashboard Overview</h2>
    </div>
    
    <p>After logging in, you&#8217;ll see your main dashboard with key metrics at a glance:</p>
    
    <div class="br-card">
      <h4>Credits Remaining</h4>
      <p>Your current credit balance, displayed in the sidebar and overview. Credits never expire and accumulate across all purchases.</p>
    </div>
    
    <div class="br-card">
      <h4>Total Verifications</h4>
      <p>Lifetime count of all emails you&#8217;ve verified through BoltRoute.</p>
    </div>
    
    <div class="br-card">
      <h4>Quality Mix</h4>
      <p>Visual breakdown of your verification results: Valid (green), Invalid (red), and Catch-all (orange).</p>
    </div>
    
    <div class="br-card">
      <h4>Credit Usage Trend</h4>
      <p>Graph showing your verification activity over time. Monitor usage patterns and plan credit purchases.</p>
    </div>
    
    <div class="br-card">
      <h4>Verification History</h4>
      <p>Recent verification tasks with status, dates, and quick access to download results.</p>
    </div>

    <div class="br-screenshot">
      <img src="/email-overview.png" alt="Dashboard Overview page with key verification metrics and charts" loading="lazy" decoding="async">
      <p>Dashboard Overview page</p>
    </div>
  </section>

  <!-- ========================================
       VERIFYING EMAILS
       ======================================== -->
  <section id="verify-emails" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">✉️</div>
      <h2>Verifying Emails</h2>
    </div>
    
    <p>BoltRoute offers two verification methods: <strong>manual</strong> for quick checks and <strong>bulk upload</strong> for lists.</p>

    <h3 id="manual-verification">Manual Verification</h3>
    <p>Best for quick checks of 1-25 emails.</p>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p>Go to <strong>Verify</strong> in the sidebar</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Paste emails into the text area — one email per line (maximum 25 emails)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Click <strong>Verify emails</strong></p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Results appear in the &#8220;Live results&#8221; panel on the right</p>
        </div>
      </div>
    </div>
    
    <div class="br-callout br-callout-warning">
      <div class="br-callout-icon">⚠️</div>
      <div class="br-callout-content">
        <p><strong>Important:</strong> Manual verification results are only available during your current session. Download them immediately after verification completes—they disappear when you log out or refresh the page.</p>
      </div>
    </div>

    <div class="br-screenshot">
      <img src="/email-manual-verification.png" alt="Verify page manual verification section with text input and live results panel" loading="lazy" decoding="async">
      <p>Verify page - manual verification section</p>
    </div>

    <h3 id="bulk-upload">Bulk Upload</h3>
    <p>Best for verifying lists of 26+ emails.</p>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p>Go to <strong>Verify</strong> in the sidebar and scroll to the <strong>Bulk upload</strong> section</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Drag and drop your file or click <strong>Browse files</strong></p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Select which column contains email addresses (column mapping)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Click to start verification. You&#8217;ll receive an email notification when complete.</p>
        </div>
      </div>
    </div>
    
    <div class="br-card">
      <h4>File Requirements</h4>
      <div class="br-table-wrapper">
        <table class="br-table">
          <tr>
            <td><strong>Supported formats</strong></td>
            <td>TXT, CSV, XLSX</td>
          </tr>
          <tr>
            <td><strong>File size limit</strong></td>
            <td>Defined by server configuration</td>
          </tr>
          <tr>
            <td><strong>Rows</strong></td>
            <td>Up to 10,000 emails per file</td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="br-callout br-callout-tip">
      <div class="br-callout-icon">💡</div>
      <div class="br-callout-content">
        <p><strong>Pre-upload checklist:</strong></p>
        <p>• Ensure each row has one email address<br>
        • Label your email column clearly (makes mapping faster)<br>
        • Remove duplicate rows if you don&#8217;t want to verify the same email twice</p>
      </div>
    </div>

    <div class="br-screenshot">
      <img src="/email-bulk-validation.png" alt="Bulk upload section with drag and drop area and pre-flight checklist" loading="lazy" decoding="async">
      <p>Bulk upload section</p>
    </div>

    <h3>Column Mapping</h3>
    <p>If your file has multiple columns, you&#8217;ll see a mapping screen. Select the column containing email addresses and confirm to start verification.</p>
    <p>BoltRoute auto-detects common header names like &#8220;email&#8221;, &#8220;Email&#8221;, &#8220;EMAIL&#8221;, &#8220;email_address&#8221;, etc.</p>

    <div class="br-screenshot">
      <img src="/email-column-mapping.png" alt="Column mapping screen for selecting the email column in uploaded files" loading="lazy" decoding="async">
      <p>Column mapping screen</p>
    </div>
  </section>

  <!-- ========================================
       UNDERSTANDING RESULTS
       ======================================== -->
  <section id="understanding-results" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">📊</div>
      <h2>Understanding Results</h2>
    </div>
    
    <h3>Verification Statuses</h3>
    
    <div class="br-table-wrapper">
      <table class="br-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
            <th>Charged?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="br-status br-status-valid">● Valid</span></td>
            <td>Email exists and can receive mail</td>
            <td><span class="br-badge-yes">Yes</span></td>
          </tr>
          <tr>
            <td><span class="br-status br-status-invalid">● Invalid</span></td>
            <td>Email doesn&#8217;t exist or is inactive</td>
            <td><span class="br-badge-yes">Yes</span></td>
          </tr>
          <tr>
            <td><span class="br-status br-status-invalid">● Invalid Syntax</span></td>
            <td>Email format is invalid (API status: <span class="br-code">invalid_syntax</span>)</td>
            <td><span class="br-badge-yes">Yes</span></td>
          </tr>
          <tr>
            <td><span class="br-status br-status-invalid">● Disposable Domain</span></td>
            <td>Disposable/temporary email domain detected (API status: <span class="br-code">disposable_domain</span>)</td>
            <td><span class="br-badge-yes">Yes</span></td>
          </tr>
          <tr>
            <td><span class="br-status br-status-catchall">● Catch-all</span></td>
            <td>Domain accepts all emails regardless of inbox existence</td>
            <td><span class="br-badge-yes">Yes</span></td>
          </tr>
          <tr>
            <td><span class="br-status br-status-unknown">● Unknown</span></td>
            <td>Couldn&#8217;t verify due to server restrictions</td>
            <td><span class="br-badge-no">No</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>What is Catch-all?</h3>
    <p>Some domains (often corporate) are configured to accept emails to any address, even if the mailbox doesn&#8217;t exist. These are called &#8220;catch-all&#8221; domains.</p>
    
    <div class="br-card">
      <h4>Example</h4>
      <p>If <span class="br-code">example.com</span> is catch-all, both <span class="br-code">john@example.com</span> and <span class="br-code">nonexistent12345@example.com</span> will be accepted by their server—we can&#8217;t determine if the specific inbox exists.</p>
    </div>
    
    <div class="br-callout br-callout-info">
      <div class="br-callout-icon">ℹ️</div>
      <div class="br-callout-content">
        <p><strong>What to do with catch-all results:</strong> Most users either send to them (accepting some bounce risk) or exclude them from cold outreach campaigns. The choice depends on your risk tolerance and use case.</p>
      </div>
    </div>

    <h3>Additional Flags</h3>
    <p>BoltRoute also detects and flags these in your export results:</p>
    
    <div class="br-table-wrapper">
      <table class="br-table">
        <thead>
          <tr>
            <th>Flag</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Disposable</strong></td>
            <td>Temporary/throwaway addresses (Mailinator, Guerrilla Mail, 10MinuteMail, etc.)</td>
          </tr>
          <tr>
            <td><strong>Role-based</strong></td>
            <td>Generic addresses like info@, support@, sales@, admin@</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ========================================
       HISTORY & DOWNLOADS
       ======================================== -->
  <section id="history" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">📁</div>
      <h2>History &#038; Downloads</h2>
    </div>
    
    <h3>Viewing Past Verifications</h3>
    <p>Go to <strong>History</strong> in the sidebar to see all verification tasks.</p>
    
    <p>Each entry shows:</p>
    <div class="br-card">
      <p>• <strong>Date</strong> — When the verification was submitted<br>
      • <strong>Task name</strong> — Filename for bulk uploads<br>
      • <strong>Valid/Invalid/Catch-all counts</strong> — Result breakdown<br>
      • <strong>Status</strong> — Completed, Processing, or Failed</p>
    </div>

    <div class="br-screenshot">
      <img src="/email-verification-history.png" alt="History page with verification task list, statuses, and download actions" loading="lazy" decoding="async">
      <p>History page</p>
    </div>

    <h3>Task Status Meanings</h3>
    
    <div class="br-table-wrapper">
      <table class="br-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="br-status br-status-completed">Completed</span></td>
            <td>Verification finished, results ready to download</td>
          </tr>
          <tr>
            <td><span class="br-status br-status-processing">Processing</span></td>
            <td>Verification in progress (time depends on list size)</td>
          </tr>
          <tr>
            <td><span class="br-status br-status-invalid">Failed</span></td>
            <td>Something went wrong — contact support</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <p>Processing time depends on list size. You&#8217;ll receive an <strong>email notification</strong> when bulk verification completes.</p>

    <h3>Downloading Results</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p>Find your completed task in History</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Click the download button</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Results download as <strong>CSV</strong> file</p>
        </div>
      </div>
    </div>
    
    <div class="br-card br-card-highlight">
      <h4>Export includes</h4>
      <p>Original email, verification status, catch-all flag, disposable flag, role-based flag</p>
    </div>
    
    <div class="br-callout br-callout-success">
      <div class="br-callout-icon">✅</div>
      <div class="br-callout-content">
        <p><strong>Results never expire.</strong> Download anytime from your History page.</p>
      </div>
    </div>
  </section>

  <!-- ========================================
       INTEGRATIONS
       ======================================== -->
  <section id="integrations" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">🔗</div>
      <h2>Integrations</h2>
    </div>
    
    <p>BoltRoute connects directly with automation platforms so you can verify emails inside your existing workflows.</p>

    <h3>Native Integrations</h3>
    
    <div class="br-integration-grid">
      <div class="br-integration-card">
        <div class="br-integration-logo">⚡</div>
        <div class="br-integration-info">
          <h4>Zapier</h4>
          <p>Trigger verification when leads arrive, forms submit, or lists update</p>
        </div>
      </div>
      <div class="br-integration-card">
        <div class="br-integration-logo">🔄</div>
        <div class="br-integration-info">
          <h4>Make</h4>
          <p>Build visual verification workflows with conditional logic</p>
        </div>
      </div>
      <div class="br-integration-card">
        <div class="br-integration-logo">🔀</div>
        <div class="br-integration-info">
          <h4>n8n</h4>
          <p>Native node for cloud or self-hosted workflows</p>
        </div>
      </div>
      <div class="br-integration-card">
        <div class="br-integration-logo">📊</div>
        <div class="br-integration-info">
          <h4>Google Sheets</h4>
          <p>Verify directly in your spreadsheet—no exports needed</p>
        </div>
      </div>
    </div>

    <div class="br-screenshot">
      <img src="/email-integrations.png" alt="Integrations page showing available integration cards and setup options" loading="lazy" decoding="async">
      <p>Integrations page</p>
    </div>

    <h3>Setting Up Zapier</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Create a new Zap</strong> — Choose your trigger app (HubSpot, Typeform, Google Sheets, etc.)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Add BoltRoute as the action</strong> — Select &#8220;Verify Email&#8221; and connect your BoltRoute account using your API key</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Map the email field</strong> from your trigger to BoltRoute</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Add another action</strong> to handle results — update the original record, add to a sheet, or route based on status</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Test and enable</strong> your Zap</p>
        </div>
      </div>
    </div>
    
    <p>⏱️ <em>Setup time: 5-10 minutes</em></p>

    <h3>Setting Up Google Sheets</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Install the add-on</strong> — Go to Extensions → Add-ons → Get add-ons → Search &#8220;BoltRoute&#8221;</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Connect your account</strong> — Enter your API key when prompted (one-time setup)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Select your email column</strong> in the BoltRoute sidebar</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Click &#8220;Verify&#8221;</strong> — Results appear in new columns: status, catch-all, disposable, role-based</p>
        </div>
      </div>
    </div>
    
    <p>⏱️ <em>Setup time: 2-3 minutes</em></p>

    <h3>Workflow Examples</h3>
    
    <div class="br-card">
      <p>• <strong>New HubSpot contact</strong> → Verify email → Update contact record with status<br>
      • <strong>Typeform submission</strong> → Verify email → Add valid leads to Mailchimp<br>
      • <strong>Google Sheet row</strong> → Verify email → Route invalid to separate tab</p>
    </div>
    
    <p>BoltRoute works with <strong>70+ tools</strong> through Zapier, Make, and n8n. If your tool connects to any of these platforms, you can integrate email verification.</p>
    
    <p>📚 <strong>For detailed setup guides:</strong> <a href="https://boltroute.ai/integration-details/" target="_blank" rel="noopener noreferrer">boltroute.ai/integration-details</a></p>
  </section>

  <!-- ========================================
       API KEYS
       ======================================== -->
  <section id="api-keys" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">🔑</div>
      <h2>API Keys</h2>
    </div>
    
    <p>API keys let you connect BoltRoute to external tools and custom applications.</p>

    <h3>Generating an API Key</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p>Go to <strong>API</strong> in the sidebar</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Click <strong>Generate API key</strong></p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Name your key (e.g., &#8220;Zapier&#8221;, &#8220;n8n&#8221;, &#8220;Google Sheets&#8221;)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p><strong>Copy the key immediately</strong> — in the dashboard it won&#8217;t be shown again</p>
        </div>
      </div>
    </div>

    <p><strong>Note:</strong> API users can retrieve plaintext keys with <span class="br-code">GET /api/v1/api-keys?reveal=true</span> when key reveal is enabled.</p>

    <div class="br-screenshot">
      <img src="/email-api.png" alt="API page with API key management table and generate key action" loading="lazy" decoding="async">
      <p>API page</p>
    </div>

    <h3>Managing Keys</h3>
    
    <p>Each key shows:</p>
    <div class="br-card">
      <p>• <strong>Name</strong> — Your label for the key<br>
      • <strong>Integration type</strong> — For usage tracking<br>
      • <strong>Status</strong> — Active or Revoked<br>
      • <strong>Actions</strong> — Revoke button</p>
    </div>
    
    <div class="br-callout br-callout-tip">
      <div class="br-callout-icon">💡</div>
      <div class="br-callout-content">
        <p><strong>Best practice:</strong> Create separate keys for each integration. This lets you track usage per platform and revoke access without affecting other integrations.</p>
      </div>
    </div>

    <h3>Revoking a Key</h3>
    <p>Find the key in your API page, click <strong>Revoke</strong>, and confirm. Revoked keys stop working immediately—any integration using that key will fail until you provide a new key.</p>

    <h3>API Rate Limits</h3>

    <div class="br-card br-card-highlight">
      <h4>Rate limits return HTTP 429</h4>
      <p>When you exceed limits, the API returns <span class="br-code">429</span> and includes a <span class="br-code">Retry-After</span> header. For higher throughput, <a href="https://boltroute.ai/contact/" target="_blank" rel="noopener noreferrer">contact us</a>.</p>
    </div>
    
    <p>📚 <strong>For API documentation and code examples:</strong> <a href="https://docs.boltroute.ai/" target="_blank" rel="noopener noreferrer">docs.boltroute.ai</a></p>
  </section>

  <!-- ========================================
       CREDITS & BILLING
       ======================================== -->
  <section id="billing" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">💳</div>
      <h2>Credits &#038; Billing</h2>
    </div>
    
    <h3>How Credits Work</h3>
    
    <div class="br-card br-card-highlight">
      <p><strong>1 credit = 1 email verification</strong></p>
    </div>
    
    <div class="br-table-wrapper">
      <table class="br-table">
        <tbody>
          <tr>
            <td><strong>Charged results</strong></td>
            <td>Valid, Invalid, Catch-all</td>
          </tr>
          <tr>
            <td><strong>Free results</strong></td>
            <td>Unknown (you&#8217;re never charged for emails we couldn&#8217;t verify)</td>
          </tr>
          <tr>
            <td><strong>Expiration</strong></td>
            <td>Credits never expire</td>
          </tr>
          <tr>
            <td><strong>Pooling</strong></td>
            <td>All credits accumulate across purchases</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>Checking Your Balance</h3>
    <p>Your credit balance appears in two places:</p>
    <p>• Left sidebar (always visible)<br>• Overview dashboard</p>

    <h3>Buying Credits</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p>Go to <strong>Pricing</strong> in the sidebar</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Choose purchase type: <strong>One-Time</strong>, <strong>Monthly</strong> (30% off), or <strong>Annual</strong> (50% off)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Use the slider to select credit amount (minimum 2,000)</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Click <strong>Buy Credits</strong> and complete payment via credit card or PayPal</p>
        </div>
      </div>
    </div>

    <div class="br-screenshot">
      <img src="/email-pricing.png" alt="Pricing page with credit volume slider and purchase options" loading="lazy" decoding="async">
      <p>Pricing page</p>
    </div>

    <div class="br-volume-pricing">
      <h4>Volume Pricing</h4>
      <p class="br-volume-subtitle">The more you verify, the more you save</p>

      <div class="br-volume-grid">
        <div class="br-volume-item">
          <p class="br-volume-tier">10K</p>
          <p class="br-volume-price">$37</p>
          <p class="br-volume-rate">$0.0037/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">25K</p>
          <p class="br-volume-price">$56</p>
          <p class="br-volume-rate">$0.00224/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">50K</p>
          <p class="br-volume-price">$84</p>
          <p class="br-volume-rate">$0.00168/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">100K</p>
          <p class="br-volume-price">$141</p>
          <p class="br-volume-rate">$0.00141/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">500K</p>
          <p class="br-volume-price">$284</p>
          <p class="br-volume-rate">$0.000568/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">1M</p>
          <p class="br-volume-price">$426</p>
          <p class="br-volume-rate">$0.000426/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">5M</p>
          <p class="br-volume-price">$1,519</p>
          <p class="br-volume-rate">$0.000304/ea</p>
        </div>
        <div class="br-volume-item">
          <p class="br-volume-tier">10M</p>
          <p class="br-volume-price">$2,469</p>
          <p class="br-volume-rate">$0.000247/ea</p>
        </div>
      </div>
    </div>
    
    <p>Monthly (30% off) and Annual (50% off) plans apply additional discounts.</p>
    <p>Need more than 10M credits? <a href="https://boltroute.ai/contact/" target="_blank" rel="noopener noreferrer">Contact sales</a>.</p>

    <h3>Purchase History</h3>
    <p>Go to <strong>Account</strong> to view all past purchases with dates, amounts, and invoice numbers.</p>

    <div class="br-screenshot">
      <img src="/email-account.png" alt="Account page purchase history section with previous transactions and invoices" loading="lazy" decoding="async">
      <p>Account page - purchase history</p>
    </div>
  </section>

  <!-- ========================================
       ACCOUNT SETTINGS
       ======================================== -->
  <section id="account" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">⚙️</div>
      <h2>Account Settings</h2>
    </div>
    
    <h3>Updating Your Profile</h3>
    <p>Go to <strong>Account</strong> in the sidebar to:</p>
    <p>• Change display name<br>• Update email address<br>• Change password</p>
    <p>Click <strong>Update profile</strong> to save changes.</p>

    <div class="br-screenshot">
      <img src="/email-account.png" alt="Account page profile section with fields for name, email, and password updates" loading="lazy" decoding="async">
      <p>Account page - profile section</p>
    </div>

    <h3>Changing Your Password</h3>
    
    <div class="br-steps">
      <div class="br-step">
        <div class="br-step-content">
          <p>Go to Account</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Enter current password</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Enter new password</p>
        </div>
      </div>
      <div class="br-step">
        <div class="br-step-content">
          <p>Click <strong>Update profile</strong></p>
        </div>
      </div>
    </div>

    <h3>Deleting Your Account</h3>
    <p><a href="https://boltroute.ai/contact/" target="_blank" rel="noopener noreferrer">Contact support</a> to request account deletion. We&#8217;ll remove your account and all associated data in compliance with GDPR.</p>
  </section>

  <!-- ========================================
       TROUBLESHOOTING
       ======================================== -->
  <section id="troubleshooting" class="br-section">
    <div class="br-section-header">
      <div class="br-section-icon">🔧</div>
      <h2>Troubleshooting</h2>
    </div>
    
    <div class="br-card">
      <h4>&#8220;Processing&#8221; Status Stuck</h4>
      <p>Bulk verification time depends on list size and domain response times. Large lists (100K+) can take several hours.</p>
      <p>If a task shows &#8220;Processing&#8221; for more than 24 hours, <a href="https://boltroute.ai/contact/" target="_blank" rel="noopener noreferrer">contact support</a>.</p>
    </div>
    
    <div class="br-card">
      <h4>Results Show Mostly &#8220;Unknown&#8221;</h4>
      <p>This usually means the email servers are blocking verification attempts. Common causes:</p>
      <p>• Target domain has aggressive rate limiting<br>
      • Target domain blocks SMTP verification entirely<br>
      • Network connectivity issues</p>
      <p><strong>Unknown results are not charged.</strong></p>
    </div>
    
    <div class="br-card">
      <h4>File Upload Fails</h4>
      <p>Check that your file:</p>
      <p>• Is TXT, CSV, or XLSX format<br>
      • Has no more than 10,000 emails<br>
      • Has at least one column with email addresses<br>
      • Isn&#8217;t corrupted (try opening it locally first)</p>
    </div>
    
    <div class="br-card">
      <h4>API Key Not Working</h4>
      <p>Verify that:</p>
      <p>• The key is copied correctly (no extra spaces)<br>
      • The key status is &#8220;Active&#8221; (not revoked)<br>
      • You&#8217;re using the correct API endpoint: <span class="br-code">https://api.boltroute.ai/api/v1/verify</span></p>
    </div>
    
    <div class="br-card">
      <h4>Wrong Credit Deduction</h4>
      <p>Credits are only deducted for Valid, Invalid, and Catch-all results. If you believe there&#8217;s an error, <a href="https://boltroute.ai/contact/" target="_blank" rel="noopener noreferrer">contact support</a> with your task ID.</p>
    </div>
  </section>

<!-- ========================================
       CONTACT SUPPORT CTA
       ======================================== -->
  <section class="br-cta">
    <h3>Still Need Help?</h3>
    <p>Our support team responds within 4 hours during business hours.</p>
    <div class="br-cta-buttons">
      <a href="https://boltroute.ai/contact/" class="br-btn br-btn-primary" target="_blank" rel="noopener noreferrer">Contact Support</a>
      <a href="https://docs.boltroute.ai/" class="br-btn br-btn-secondary" target="_blank" rel="noopener noreferrer">View API Docs →</a>
    </div>
  </section>

  <!-- ========================================
       RELATED RESOURCES
       ======================================== -->
  <section class="br-section">
    <h3>Related Resources</h3>
    
    <div class="br-resources-grid">
      <a href="https://docs.boltroute.ai/" target="_blank" rel="noopener noreferrer" class="br-resource-card">
        <h4>📘 API Documentation</h4>
        <p>For developers building custom integrations</p>
      </a>
      <a href="https://boltroute.ai/integration-details/" target="_blank" rel="noopener noreferrer" class="br-resource-card">
        <h4>🔧 Integration Setup Guide</h4>
        <p>Step-by-step integration tutorials</p>
      </a>
      <a href="https://boltroute.ai/pricing/" target="_blank" rel="noopener noreferrer" class="br-resource-card">
        <h4>💰 Pricing Details</h4>
        <p>Full plan comparison and FAQ</p>
      </a>
      <a href="https://boltroute.ai/blog/" target="_blank" rel="noopener noreferrer" class="br-resource-card">
        <h4>📝 Blog</h4>
        <p>Email deliverability tips and best practices</p>
      </a>
    </div>
  </section>

</div>`;
