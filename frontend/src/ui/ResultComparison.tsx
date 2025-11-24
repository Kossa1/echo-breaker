import { motion } from 'framer-motion'

interface ResultComparisonProps {
  demUser: number
  demActual: number
  repUser: number
  repActual: number
  onNext?: () => void
  nextButtonText?: string
}

export default function ResultComparison({
  demUser,
  demActual,
  repUser,
  repActual,
  onNext,
  nextButtonText = 'Next Question',
}: ResultComparisonProps) {


  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        //ease: [0.42, 0, 0.58, 1]
      },
    },
  }

  const markerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        //ease: [0.42, 0, 0.58, 1],
        delay: 0.6,
      },
    },
  }

  // Create fill variants dynamically based on user value
  const createFillVariants = (targetWidth: number) => ({
    hidden: { width: 0 },
    visible: {
      width: `${targetWidth}%`,
      transition: {
        duration: 0.8,
        //ease: [0.42, 0, 0.58, 1],
        delay: 0.2,
      },
    },
  })

  // Single bar component
  const ComparisonBar = ({
    userValue,
    actualValue,
    party,
    partyName,
  }: {
    userValue: number
    actualValue: number
    party: 'dem' | 'rep'
    partyName: string
  }) => {
    const delta = userValue - actualValue
    const direction = Math.abs(delta) < 0.1 ? 'exact' : delta > 0 ? 'over' : 'under'

    return (
      <motion.div
        variants={itemVariants}
        style={{ marginBottom: '48px' }}
      >
        {/* Party header with labels */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#4a4a4a',
            }}
          >
            {partyName}
          </h4>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '0.75rem',
              color: '#4a4a4a',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 500 }}>Your guess:</span>
              <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{userValue.toFixed(1)}%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 500 }}>Actual:</span>
              <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{actualValue.toFixed(1)}%</span>
            </span>
          </div>
        </div>

        {/* Bar container */}
        <div style={{ position: 'relative' }}>
          {/* Outlined bar background */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '48px',
              border: '1px solid #d1d5db',
              borderRadius: '2px',
              backgroundColor: '#f9fafb',
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={actualValue}
            aria-label={`${partyName}: Your guess ${userValue.toFixed(1)}%, Actual ${actualValue.toFixed(1)}%`}
          >
            {/* User guess fill */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                borderRadius: '2px',
                backgroundColor: party === 'dem' ? '#3b82f6' : '#ef4444',
              }}
              variants={createFillVariants(userValue)}
              initial="hidden"
              animate="visible"
            />

            {/* Actual value marker (triangle pointer) */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${actualValue}%`,
                transform: 'translateX(-50%)',
                width: '2px',
              }}
              variants={markerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Vertical line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: party === 'dem' ? '#1e40af' : '#b91c1c',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
              {/* Triangle pointing down */}
              {/* <div
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: `8px solid ${party === 'dem' ? '#1e40af' : '#b91c1c'}`,
                }}
              /> */}
            </motion.div>

            {/* Floating labels inside bar (when space allows) */}
            {userValue >= 8 && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `${Math.min(userValue - 2, 88)}%`,
                  display: 'flex',
                  alignItems: 'center',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.3 }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {userValue.toFixed(1)}%
                </span>
              </motion.div>
            )}

            {actualValue >= 8 && Math.abs(userValue - actualValue) > 5 && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: `${Math.min(actualValue + 2, 88)}%`,
                  display: 'flex',
                  alignItems: 'center',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.3 }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: party === 'dem' ? '#1e40af' : '#b91c1c',
                    whiteSpace: 'nowrap',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {actualValue.toFixed(1)}%
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Summary text below bar */}
        <motion.p
          variants={itemVariants}
          style={{
            marginTop: '16px',
            fontSize: '0.875rem',
            lineHeight: 1.7,
            color: '#4a4a4a',
          }}
        >
          {direction === 'exact' ? (
            <>
              You guessed{' '}
              <span
                style={{
                  fontWeight: 700,
                  color: party === 'dem' ? '#2563eb' : '#dc2626',
                }}
              >
                {partyName}
              </span>{' '}
              exactly ({actualValue.toFixed(1)}%).
            </>
          ) : (
            <>
              You{' '}
              <span
                style={{
                  fontWeight: 700,
                  color: party === 'dem' ? '#2563eb' : '#dc2626',
                }}
              >
                {direction === 'over' ? 'overestimated' : 'underestimated'}
              </span>{' '}
              {partyName} by{' '}
              <span style={{ fontWeight: 700, color: '#1a1a1a' }}>
                {Math.abs(delta).toFixed(1)}
              </span>{' '}
              points.
            </>
          )}
        </motion.p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        width: '100%',
        maxWidth: '640px',
        margin: '0 auto',
      }}
    >
      {/* Title */}
      <motion.h3
        variants={itemVariants}
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: '1.5rem',
          fontWeight: 400,
          color: '#1a1a1a',
          marginBottom: '32px',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        Ground Truth
      </motion.h3>

      {/* Democrats Bar */}
      <ComparisonBar
        userValue={demUser}
        actualValue={demActual}
        party="dem"
        partyName="Democrats"
      />

      {/* Republicans Bar */}
      <ComparisonBar
        userValue={repUser}
        actualValue={repActual}
        party="rep"
        partyName="Republicans"
      />

      {/* Next Button */}
      {onNext && (
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '40px',
          }}
        >
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: '14px 32px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d2d2d'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            aria-label={nextButtonText}
          >
            {nextButtonText}
          </button>
        </motion.div>
      )}

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .result-comparison-bar-group {
            margin-bottom: 36px;
          }
          
          .result-comparison-bar-group h4 {
            font-size: 0.8125rem;
            margin-bottom: 8px;
          }
          
          .result-comparison-bar-group > div:first-child {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .result-comparison-bar-group > div:first-child > div:last-child {
            font-size: 0.6875rem;
            gap: 12px;
          }
        }
      `}</style>
    </motion.div>
  )
}
