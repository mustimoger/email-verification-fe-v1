import React, { useState, useEffect } from 'react';

const PRICING_TIERS = [
  { volume: 2000, payg: 7, label: '2K' },
  { volume: 5000, payg: 19, label: '5K' },
  { volume: 10000, payg: 37, label: '10K' },
  { volume: 25000, payg: 59, label: '25K' },
  { volume: 50000, payg: 89, label: '50K' },
  { volume: 100000, payg: 129, label: '100K' },
  { volume: 250000, payg: 200, label: '250K' },
  { volume: 500000, payg: 300, label: '500K' },
  { volume: 1000000, payg: 390, label: '1M' },
  { volume: 2500000, payg: 800, label: '2.5M' },
  { volume: 5000000, payg: 1400, label: '5M' },
  { volume: 10000000, payg: 2500, label: '10M' },
];

const PLAN_MULTIPLIERS = {
  payg: 1,
  monthly: 0.85,
  annual: 0.80,
};

export default function BoltRoutePricing() {
  const [selectedTierIndex, setSelectedTierIndex] = useState(2); // Start at 10K
  const [planType, setPlanType] = useState('payg');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const currentTier = PRICING_TIERS[selectedTierIndex];
  const basePrice = currentTier.payg;
  const finalPrice = Math.round(basePrice * PLAN_MULTIPLIERS[planType]);
  const pricePerEmail = (finalPrice / currentTier.volume).toFixed(6);
  const savings = planType !== 'payg' ? Math.round((1 - PLAN_MULTIPLIERS[planType]) * 100) : 0;

  const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };

  const getPlanLabel = () => {
    switch(planType) {
      case 'monthly': return 'Monthly';
      case 'annual': return 'Annual';
      default: return 'One-Time';
    }
  };

  const getPriceLabel = () => {
    switch(planType) {
      case 'monthly': return '/month';
      case 'annual': return '/month';
      default: return '';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#ffffff',
      padding: '0',
      margin: '0',
      overflow: 'hidden',
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 168, 37, 0.15), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '800px',
        height: '800px',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(249, 168, 37, 0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '60px',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(249, 168, 37, 0.1)',
            border: '1px solid rgba(249, 168, 37, 0.2)',
            borderRadius: '100px',
            padding: '8px 16px',
            marginBottom: '24px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#f9a825',
            letterSpacing: '0.5px',
          }}>
            <span style={{ width: '6px', height: '6px', background: '#f9a825', borderRadius: '50%' }} />
            SIMPLE, TRANSPARENT PRICING
          </div>
          
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: '700',
            margin: '0 0 16px 0',
            letterSpacing: '-0.02em',
            lineHeight: '1.1',
          }}>
            Pay only for what you
            <span style={{
              background: 'linear-gradient(135deg, #f9a825 0%, #ff8f00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline',
            }}> verify</span>
          </h1>
          
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.6)',
            margin: '0',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6',
          }}>
            Credits never expire. No charge for unknowns or catch-all emails.
          </p>
        </div>

        {/* Main Pricing Card */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          backdropFilter: 'blur(20px)',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
        }}>
          {/* Plan Type Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '48px',
          }}>
            <div style={{
              display: 'inline-flex',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '4px',
              gap: '4px',
            }}>
              {[
                { id: 'payg', label: 'One-Time Purchase', badge: null },
                { id: 'monthly', label: 'Monthly', badge: 'Save 15%' },
                { id: 'annual', label: 'Annual', badge: 'Save 20%' },
              ].map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setPlanType(plan.id)}
                  style={{
                    position: 'relative',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: planType === plan.id 
                      ? 'linear-gradient(135deg, #f9a825 0%, #f57c00 100%)' 
                      : 'transparent',
                    color: planType === plan.id ? '#000' : 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {plan.label}
                  {plan.badge && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: planType === plan.id ? 'rgba(0,0,0,0.2)' : 'rgba(249, 168, 37, 0.2)',
                      color: planType === plan.id ? '#000' : '#f9a825',
                    }}>
                      {plan.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 380px',
            gap: '48px',
            alignItems: 'start',
          }}>
            {/* Left Column - Slider */}
            <div>
              <div style={{
                marginBottom: '32px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Email Credits
                  </span>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#fff',
                  }}>
                    {formatNumber(currentTier.volume)}
                  </span>
                </div>

                {/* Custom Slider */}
                <div style={{ position: 'relative', padding: '10px 0' }}>
                  <input
                    type="range"
                    min="0"
                    max={PRICING_TIERS.length - 1}
                    value={selectedTierIndex}
                    onChange={(e) => setSelectedTierIndex(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, #f9a825 0%, #f9a825 ${(selectedTierIndex / (PRICING_TIERS.length - 1)) * 100}%, rgba(255,255,255,0.1) ${(selectedTierIndex / (PRICING_TIERS.length - 1)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                      outline: 'none',
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    }}
                  />
                  <style>{`
                    input[type="range"]::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, #f9a825 0%, #f57c00 100%);
                      cursor: pointer;
                      box-shadow: 0 4px 12px rgba(249, 168, 37, 0.4);
                      border: 3px solid #fff;
                      transition: transform 0.2s ease;
                    }
                    input[type="range"]::-webkit-slider-thumb:hover {
                      transform: scale(1.1);
                    }
                    input[type="range"]::-moz-range-thumb {
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, #f9a825 0%, #f57c00 100%);
                      cursor: pointer;
                      box-shadow: 0 4px 12px rgba(249, 168, 37, 0.4);
                      border: 3px solid #fff;
                    }
                  `}</style>
                </div>

                {/* Volume Markers */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  padding: '0 4px',
                }}>
                  {['2K', '10K', '100K', '1M', '10M'].map((label, idx) => (
                    <span
                      key={label}
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                        fontWeight: '500',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Features List */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <h3 style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '20px',
                  marginTop: '0',
                }}>
                  Everything Included
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}>
                  {[
                    { icon: '✓', text: 'Credits never expire' },
                    { icon: '✓', text: 'No charge for unknowns' },
                    { icon: '✓', text: 'No charge for catch-all' },
                    { icon: '✓', text: '99%+ accuracy' },
                    { icon: '✓', text: 'Real-time API access' },
                    { icon: '✓', text: 'Bulk upload (CSV, XLSX)' },
                    { icon: '✓', text: 'All integrations included' },
                    { icon: '✓', text: 'Priority support' },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    >
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(249, 168, 37, 0.15)',
                        color: '#f9a825',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        flexShrink: 0,
                      }}>
                        {feature.icon}
                      </span>
                      {feature.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Enterprise CTA */}
              <div style={{
                marginTop: '24px',
                padding: '16px 20px',
                background: 'rgba(249, 168, 37, 0.05)',
                border: '1px solid rgba(249, 168, 37, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  Need more than 10M credits?
                </span>
                <button style={{
                  background: 'transparent',
                  border: '1px solid rgba(249, 168, 37, 0.4)',
                  color: '#f9a825',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                  Contact Sales →
                </button>
              </div>
            </div>

            {/* Right Column - Price Card */}
            <div style={{
              background: 'linear-gradient(180deg, #1a1a24 0%, #14141c 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '32px',
              position: 'sticky',
              top: '24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {getPlanLabel()} Cost
                </span>
                {savings > 0 && (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(76, 175, 80, 0.15)',
                    color: '#4caf50',
                  }}>
                    SAVE {savings}%
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
                marginBottom: '4px',
              }}>
                <span style={{
                  fontSize: '56px',
                  fontWeight: '700',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  ${finalPrice}
                </span>
                <span style={{
                  fontSize: '18px',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: '500',
                }}>
                  {getPriceLabel()}
                </span>
              </div>

              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '24px',
              }}>
                ${pricePerEmail} per email
              </div>

              {planType === 'annual' && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  Billed annually: <strong style={{ color: '#fff' }}>${finalPrice * 12}/year</strong>
                </div>
              )}

              {planType === 'monthly' && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  Credits roll over each month
                </div>
              )}

              <button style={{
                width: '100%',
                padding: '18px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #f9a825 0%, #f57c00 100%)',
                color: '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 32px rgba(249, 168, 37, 0.3)',
                marginBottom: '20px',
              }}>
                {planType === 'payg' ? 'Buy Credits' : 'Subscribe Now'}
              </button>

              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '20px',
              }}>
                {[
                  'Instant activation',
                  'Secure payment',
                  'Cancel anytime',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: idx < 2 ? '8px' : '0',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {item}
                  </div>
                ))}
              </div>

              {/* Payment Methods */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>We accept</span>
                {['Visa', 'MC', 'Amex', 'PayPal'].map((method) => (
                  <span
                    key={method}
                    style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      color: 'rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Volume Pricing Table */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '40px',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '8px',
            marginTop: '0',
          }}>
            Volume Pricing
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '32px',
            marginTop: '0',
          }}>
            The more you verify, the more you save
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '12px',
          }}>
            {PRICING_TIERS.slice(0, 6).map((tier, idx) => (
              <div
                key={tier.volume}
                onClick={() => setSelectedTierIndex(idx)}
                style={{
                  background: selectedTierIndex === idx 
                    ? 'linear-gradient(135deg, rgba(249, 168, 37, 0.15) 0%, rgba(249, 168, 37, 0.05) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: selectedTierIndex === idx 
                    ? '1px solid rgba(249, 168, 37, 0.3)'
                    : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '20px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: selectedTierIndex === idx ? '#f9a825' : 'rgba(255,255,255,0.5)',
                  marginBottom: '8px',
                }}>
                  {tier.label}
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '4px',
                }}>
                  ${tier.payg}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  ${(tier.payg / tier.volume).toFixed(4)}/ea
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '12px',
            marginTop: '12px',
          }}>
            {PRICING_TIERS.slice(6, 12).map((tier, idx) => (
              <div
                key={tier.volume}
                onClick={() => setSelectedTierIndex(idx + 6)}
                style={{
                  background: selectedTierIndex === idx + 6
                    ? 'linear-gradient(135deg, rgba(249, 168, 37, 0.15) 0%, rgba(249, 168, 37, 0.05) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: selectedTierIndex === idx + 6
                    ? '1px solid rgba(249, 168, 37, 0.3)'
                    : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '20px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: selectedTierIndex === idx + 6 ? '#f9a825' : 'rgba(255,255,255,0.5)',
                  marginBottom: '8px',
                }}>
                  {tier.label}
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '4px',
                }}>
                  ${tier.payg}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  ${(tier.payg / tier.volume).toFixed(4)}/ea
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '40px',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '8px',
            marginTop: '0',
            textAlign: 'center',
          }}>
            Why BoltRoute?
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '32px',
            marginTop: '0',
            textAlign: 'center',
          }}>
            Same pricing as budget tools. Superior everything else.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '0',
          }}>
            {/* Header Row */}
            <div style={{ padding: '16px 20px' }}></div>
            <div style={{
              padding: '16px 20px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, rgba(249, 168, 37, 0.1) 0%, transparent 100%)',
              borderRadius: '12px 12px 0 0',
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#f9a825',
              }}>BoltRoute</span>
            </div>
            <div style={{
              padding: '16px 20px',
              textAlign: 'center',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.5)',
              }}>Others</span>
            </div>

            {/* Comparison Rows */}
            {[
              { feature: 'Price (100K emails)', boltroute: '$129', others: '$129-$390' },
              { feature: 'Credits Expire', boltroute: 'Never', others: '30-365 days' },
              { feature: 'Catch-all Detection', boltroute: 'Advanced', others: 'Basic' },
              { feature: 'Charge for Unknowns', boltroute: 'Free', others: 'Often charged' },
              { feature: 'Support Response', boltroute: '< 4 hours', others: '24-72 hours' },
              { feature: 'Uptime SLA', boltroute: '99.9%', others: 'No guarantee' },
            ].map((row, idx) => (
              <React.Fragment key={idx}>
                <div style={{
                  padding: '16px 20px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {row.feature}
                </div>
                <div style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#fff',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(249, 168, 37, 0.03)',
                }}>
                  {row.boltroute}
                </div>
                <div style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.4)',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {row.others}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{
          marginBottom: '60px',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}>
            {[
              {
                q: 'Do credits expire?',
                a: 'Never. Your credits remain valid indefinitely until you use them.'
              },
              {
                q: 'What if an email can\'t be verified?',
                a: 'You\'re not charged for unknown or catch-all results. Only pay for definitive verifications.'
              },
              {
                q: 'Can I switch between plans?',
                a: 'Yes, upgrade or downgrade anytime. Unused credits always roll over.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept Visa, Mastercard, American Express, and PayPal.'
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '8px',
                  marginTop: '0',
                }}>
                  {faq.q}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  margin: '0',
                  lineHeight: '1.6',
                }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          textAlign: 'center',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(249, 168, 37, 0.1) 0%, rgba(249, 168, 37, 0.02) 100%)',
          border: '1px solid rgba(249, 168, 37, 0.15)',
          borderRadius: '24px',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s',
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '16px',
            marginTop: '0',
          }}>
            Start verifying emails today
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '32px',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Get 100 free credits to test our accuracy. No credit card required.
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}>
            <button style={{
              padding: '16px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #f9a825 0%, #f57c00 100%)',
              color: '#000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(249, 168, 37, 0.3)',
            }}>
              Start Free Trial
            </button>
            <button style={{
              padding: '16px 32px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}>
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
