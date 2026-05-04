"use client"

import { CheckCircle2, X, AlertCircle, Gift, Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface WithdrawalInfoModalProps {
  isOpen: boolean
  isEligible: boolean
  completedTasksCount: number
  referralCount: number
  onClose: () => void
  onProceed: () => void
}

export function WithdrawalInfoModal({
  isOpen,
  isEligible,
  completedTasksCount,
  referralCount,
  onClose,
  onProceed,
}: WithdrawalInfoModalProps) {
  const router = useRouter()
  const TOTAL_TASKS = 10
  const REQUIRED_REFERRALS = 5

  if (!isOpen) return null



  return (
    <>
      {/* Backdrop */}
      <div className="withdrawal-info-backdrop" onClick={onClose}></div>

      {/* Modal */}
      <div className="withdrawal-info-modal">
        {isEligible ? (
          <>
            {/* Eligible State */}
            <div className="modal-content eligible">
              <div className="success-icon-container">
                <CheckCircle2 className="h-16 w-16 text-emerald-400" />
              </div>

              <h2 className="modal-title">All Requirements Met!</h2>
              <p className="modal-subtitle">You're eligible for withdrawal</p>

              <div className="requirements-summary">
                <div className="summary-item completed">
                  <Gift className="h-5 w-5" />
                  <div>
                    <span className="summary-label">Daily Tasks</span>
                    <span className="summary-value">{completedTasksCount}/10 Complete</span>
                  </div>
                </div>
                <div className="summary-item completed">
                  <Users className="h-5 w-5" />
                  <div>
                    <span className="summary-label">Referrals</span>
                    <span className="summary-value">{referralCount}/5 Active</span>
                  </div>
                </div>
              </div>

              <button className="modal-btn btn-proceed" onClick={onProceed}>
                Proceed to Withdrawal
              </button>
              <button className="modal-btn btn-close" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Not Eligible State */}
            <div className="modal-content not-eligible">
              <div className="warning-icon-container">
                <AlertCircle className="h-16 w-16 text-amber-400" />
              </div>

              <h2 className="modal-title">Requirements Not Met</h2>
              <p className="modal-subtitle">Complete all requirements to withdraw</p>

              <div className="requirements-list">
                <div className={`requirement-item ${completedTasksCount >= TOTAL_TASKS ? 'completed' : 'pending'} cursor-pointer`} onClick={() => router.push('/task')}>
                  <div className="requirement-icon">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="requirement-content">
                    <span className="requirement-title">Complete Daily Tasks</span>
                    <span className="requirement-progress">{completedTasksCount}/{TOTAL_TASKS}</span>
                  </div>
                  {completedTasksCount >= TOTAL_TASKS ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <span className="requirement-missing">{TOTAL_TASKS - completedTasksCount} left</span>
                  )}
                </div>

                <div className={`requirement-item ${referralCount >= REQUIRED_REFERRALS ? 'completed' : 'pending'} cursor-pointer`} onClick={() => router.push('/refer')}>
                  <div className="requirement-icon">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="requirement-content">
                    <span className="requirement-title">Get Active Referrals</span>
                    <span className="requirement-progress">{referralCount}/{REQUIRED_REFERRALS}</span>
                  </div>
                  {referralCount >= REQUIRED_REFERRALS ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <span className="requirement-missing">{REQUIRED_REFERRALS - referralCount} left</span>
                  )}
                </div>
              </div>

              <button className="modal-btn btn-close" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {/* Close Button */}
        <button className="close-btn" onClick={onClose} title="Close modal">
          <X className="h-5 w-5" />
        </button>
      </div>

      <style jsx>{`
        /* ─── BACKDROP ─── */
        .withdrawal-info-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 40;
          animation: fadeIn 0.2s ease;
        }

        /* ─── MODAL ─── */
        .withdrawal-info-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 480px;
          background: linear-gradient(135deg, rgba(5, 13, 20, 0.95) 0%, rgba(5, 13, 20, 0.9) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 24px;
          z-index: 50;
          animation: slideUp 0.3s ease;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.1);
          position: relative;
        }

        /* ─── MODAL CONTENT ─── */
        .modal-content {
          padding: 40px 24px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .modal-content.eligible {
          gap: 16px;
        }

        .modal-content.not-eligible {
          gap: 20px;
        }

        /* ─── ICONS ─── */
        .success-icon-container,
        .warning-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        /* ─── TITLE & SUBTITLE ─── */
        .modal-title {
          font-size: 24px;
          font-weight: 800;
          color: white;
          margin: 0;
          line-height: 1.3;
        }

        .modal-subtitle {
          font-size: 14px;
          color: rgba(16, 185, 129, 0.7);
          margin: 0;
          font-weight: 500;
        }

        /* ─── REQUIREMENTS SUMMARY ─── */
        .requirements-summary {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 12px 0;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          color: #10b981;
        }

        .summary-item.completed {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .summary-item > div {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .summary-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }

        .summary-value {
          font-size: 14px;
          font-weight: 700;
          color: #10b981;
        }

        /* ─── WITHDRAWAL WINDOW CARD ─── */
        .withdrawal-window-card {
          width: 100%;
          padding: 16px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 14px;
          margin: 8px 0;
        }

        .window-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #60a5fa;
          margin-bottom: 12px;
        }

        .window-times {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .time-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .time-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .time-value {
          font-size: 13px;
          font-weight: 700;
          color: #60a5fa;
        }

        .time-divider {
          color: rgba(255, 255, 255, 0.3);
          font-weight: 600;
        }

        /* ─── WINDOW STATUS ─── */
        .window-status {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .window-status.status-open {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .window-status.status-closed {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1.5s ease-in-out infinite;
        }

        /* ─── REQUIREMENTS LIST ─── */
        .requirements-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 12px 0;
        }

        .requirement-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .requirement-item.completed {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .requirement-item.pending {
          background: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.15);
        }

        .requirement-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
          color: #60a5fa;
        }

        .requirement-item.completed .requirement-icon {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .requirement-item.pending .requirement-icon {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .requirement-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .requirement-title {
          font-size: 14px;
          font-weight: 700;
          color: white;
        }

        .requirement-progress {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }

        .requirement-missing {
          font-size: 12px;
          font-weight: 700;
          color: #fbbf24;
        }

        /* ─── BUTTONS ─── */
        .modal-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-proceed {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }

        .btn-proceed:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.4);
        }

        .btn-proceed:active {
          transform: translateY(0);
        }

        .btn-close {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
        }

        .btn-close:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .btn-close:active {
          transform: scale(0.98);
        }

        /* ─── CLOSE BUTTON ─── */
        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.05);
        }

        /* ─── ANIMATIONS ─── */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
}
