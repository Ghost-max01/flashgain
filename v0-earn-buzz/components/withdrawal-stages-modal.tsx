"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Clock, Users, AlertCircle, Zap, ChevronRight, X } from "lucide-react"

interface WithdrawalStagesModalProps {
  isOpen: boolean
  completedTasksCount: number
  referralCount: number
  onClose: () => void
  onProceedToWithdrawal: () => void
}

export function WithdrawalStagesModal({
  isOpen,
  completedTasksCount,
  referralCount,
  onClose,
  onProceedToWithdrawal,
}: WithdrawalStagesModalProps) {
  const TOTAL_TASKS = 10
  const REQUIRED_REFERRALS = 5

  // Determine current stage
  const stage1Complete = completedTasksCount >= TOTAL_TASKS
  const stage2Complete = referralCount >= REQUIRED_REFERRALS
  const currentStage = !stage1Complete ? 1 : !stage2Complete ? 2 : 3

  const isAllStagesComplete = stage1Complete && stage2Complete

  if (!isOpen) return null

  const getWithdrawalTimeStatus = () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
    const hours = now.getHours()
    const minutes = now.getMinutes()

    // Convert to minutes since midnight
    const minutesSinceMidnight = hours * 60 + minutes

    // Thursday 23:50 = 1430 minutes
    // Sunday 23:59 = 1439 minutes
    const THURSDAY_OPEN = 23 * 60 + 50 // 1430
    const SUNDAY_CLOSE = 23 * 60 + 59 // 1439

    // Check if we're in Thursday after 23:50 (11:50pm)
    const thursdayOpen = dayOfWeek === 4 && minutesSinceMidnight >= THURSDAY_OPEN
    // Check if we're on Friday or Saturday anytime
    const fridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6
    // Check if we're on Sunday before 23:59 (11:59pm)
    const sundayOpen = dayOfWeek === 0 && minutesSinceMidnight < SUNDAY_CLOSE

    const isWithdrawalOpen = thursdayOpen || fridayOrSaturday || sundayOpen

    return { isWithdrawalOpen, dayOfWeek, minutesSinceMidnight }
  }

  const withdrawalStatus = getWithdrawalTimeStatus()

  const renderStage = (stageNumber: number) => {
    const isCompleted = stageNumber === 1 ? stage1Complete : stageNumber === 2 ? stage2Complete : isAllStagesComplete
    const isCurrent = stageNumber === currentStage
    const isLocked = stageNumber > currentStage

    return (
      <div key={stageNumber} className="withdrawal-stage-item">
        {/* Stage Header */}
        <div className={`stage-header ${isCompleted ? 'stage-completed' : isCurrent ? 'stage-current' : isLocked ? 'stage-locked' : ''}`}>
          <div className="stage-indicator">
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            ) : (
              <div className={`stage-number ${isCurrent ? 'animate-pulse' : ''}`}>
                {stageNumber}
              </div>
            )}
          </div>

          <div className="stage-info">
            {stageNumber === 1 && (
              <>
                <h3 className="stage-title">Complete Daily Tasks</h3>
                <p className="stage-label">Stage 1 of 3</p>
              </>
            )}
            {stageNumber === 2 && (
              <>
                <h3 className="stage-title">Build Your Network</h3>
                <p className="stage-label">Stage 2 of 3</p>
              </>
            )}
            {stageNumber === 3 && (
              <>
                <h3 className="stage-title">Withdrawal Window</h3>
                <p className="stage-label">Stage 3 of 3</p>
              </>
            )}
          </div>

          {isLocked && (
            <div className="stage-lock">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          {isCompleted && !isCurrent && (
            <div className="stage-check">
              <Zap className="h-4 w-4" />
            </div>
          )}
          {isCurrent && (
            <div className="stage-current-indicator">
              <div className="pulse-ring"></div>
              <div className="pulse-dot"></div>
            </div>
          )}
        </div>

        {/* Stage Content */}
        <div className={`stage-content ${isLocked ? 'stage-content-locked' : ''}`}>
          {stageNumber === 1 && (
            <>
              <div className="stage-progress">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min((completedTasksCount / TOTAL_TASKS) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  <span className="progress-count">{completedTasksCount}/{TOTAL_TASKS}</span>
                  <span className="progress-label">tasks completed</span>
                </div>
              </div>
              <p className="stage-description">
                {stage1Complete
                  ? "✓ All daily tasks completed! You've unlocked the next stage."
                  : `Complete all ${TOTAL_TASKS} daily tasks to proceed. You're ${TOTAL_TASKS - completedTasksCount} tasks away!`}
              </p>
            </>
          )}

          {stageNumber === 2 && (
            <>
              <div className="stage-progress">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar progress-referral"
                    style={{ width: `${Math.min((referralCount / REQUIRED_REFERRALS) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  <span className="progress-count">{referralCount}/{REQUIRED_REFERRALS}</span>
                  <span className="progress-label">active referrals</span>
                </div>
              </div>
              <p className="stage-description">
                {stage2Complete
                  ? "✓ Referral requirement met! You've unlocked the final stage."
                  : `Get ${REQUIRED_REFERRALS} active referrals to proceed. You're ${REQUIRED_REFERRALS - referralCount} referrals away!`}
              </p>
            </>
          )}

          {stageNumber === 3 && (
            <>
              <div className="withdrawal-window-info">
                <div className="window-item">
                  <div className="window-label">Opens:</div>
                  <div className="window-value">Thursday 11:50 PM</div>
                </div>
                <div className="window-item">
                  <div className="window-label">Closes:</div>
                  <div className="window-value">Sunday 11:59 PM</div>
                </div>
              </div>

              <div className={`withdrawal-status ${withdrawalStatus.isWithdrawalOpen ? 'status-open' : 'status-closed'}`}>
                <div className="status-indicator">
                  {withdrawalStatus.isWithdrawalOpen ? (
                    <>
                      <div className="status-dot status-open-dot"></div>
                      <span className="status-text">Withdrawal Window is OPEN</span>
                    </>
                  ) : (
                    <>
                      <div className="status-dot status-closed-dot"></div>
                      <span className="status-text">Withdrawal Window is CLOSED</span>
                    </>
                  )}
                </div>
              </div>

              {isAllStagesComplete && withdrawalStatus.isWithdrawalOpen && (
                <div className="success-message">
                  <CheckCircle2 className="h-5 w-5" />
                  <p>All requirements met! Ready to withdraw.</p>
                </div>
              )}

              {isAllStagesComplete && !withdrawalStatus.isWithdrawalOpen && (
                <div className="info-message">
                  <Clock className="h-5 w-5" />
                  <p>Come back during the withdrawal window (Thu 11:50 PM - Sun 11:59 PM) to complete your withdrawal.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stage Footer */}
        {!isCompleted && !isLocked && (
          <div className="stage-footer">
            {stageNumber === 1 && (
              <a href="/task" className="stage-action-link">
                <span>Go to Tasks</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            )}
            {stageNumber === 2 && (
              <a href="/refer" className="stage-action-link">
                <span>Invite Friends</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="withdrawal-modal-backdrop" onClick={onClose}></div>

      {/* Modal */}
      <div className="withdrawal-stages-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2 className="modal-title">Withdrawal Requirements</h2>
            <p className="modal-subtitle">Complete each stage to unlock withdrawal</p>
          </div>
          <button className="close-button" onClick={onClose} title="Close withdrawal requirements modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stages Container */}
        <div className="stages-container">
          {[1, 2, 3].map((stageNumber) => renderStage(stageNumber))}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          {isAllStagesComplete && withdrawalStatus.isWithdrawalOpen ? (
            <button className="action-btn btn-primary" onClick={onProceedToWithdrawal}>
              Proceed to Withdrawal
              <Zap className="h-4 w-4" />
            </button>
          ) : isAllStagesComplete ? (
            <button className="action-btn btn-secondary" disabled>
              <Clock className="h-4 w-4" />
              Waiting for Withdrawal Window
            </button>
          ) : null}

          <button className="action-btn btn-secondary" onClick={onClose}>
            {isAllStagesComplete ? "I'll Return Later" : "Close"}
          </button>
        </div>
      </div>

      <style jsx>{`
        /* ─── BACKDROP ─── */
        .withdrawal-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 40;
          animation: fadeIn 0.2s ease;
        }

        /* ─── MODAL ─── */
        .withdrawal-stages-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          background: linear-gradient(135deg, rgba(5, 13, 20, 0.95) 0%, rgba(5, 13, 20, 0.9) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          z-index: 50;
          animation: slideUp 0.3s ease;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.1);
        }

        /* ─── HEADER ─── */
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.15);
          gap: 16px;
        }

        .header-content {
          flex: 1;
        }

        .modal-title {
          font-size: 22px;
          font-weight: 800;
          color: white;
          margin: 0;
          line-height: 1.3;
        }

        .modal-subtitle {
          font-size: 13px;
          color: rgba(16, 185, 129, 0.7);
          margin: 6px 0 0 0;
          font-weight: 500;
        }

        .close-button {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.05);
        }

        /* ─── STAGES CONTAINER ─── */
        .stages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ─── STAGE ITEM ─── */
        .withdrawal-stage-item {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .withdrawal-stage-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }

        /* ─── STAGE HEADER ─── */
        .stage-header {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .stage-header.stage-completed {
          background: rgba(16, 185, 129, 0.08);
          border-bottom-color: rgba(16, 185, 129, 0.15);
        }

        .stage-header.stage-current {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(245, 158, 11, 0.05));
          border-bottom-color: rgba(16, 185, 129, 0.2);
        }

        .stage-header.stage-locked {
          opacity: 0.6;
        }

        /* ─── STAGE INDICATOR ─── */
        .stage-indicator {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stage-number {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(245, 158, 11, 0.2));
          border: 1.5px solid rgba(16, 185, 129, 0.4);
          color: white;
          font-weight: 700;
          font-size: 14px;
        }

        /* ─── STAGE INFO ─── */
        .stage-info {
          flex: 1;
        }

        .stage-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
          margin: 0;
          line-height: 1.3;
        }

        .stage-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin: 4px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        /* ─── STAGE LOCK/CHECK/CURRENT ─── */
        .stage-lock,
        .stage-check,
        .stage-current-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        .stage-lock {
          color: rgba(255, 255, 255, 0.4);
        }

        .stage-check {
          color: rgba(16, 185, 129, 0.7);
          animation: slideInRight 0.3s ease;
        }

        .stage-current-indicator {
          position: relative;
        }

        .pulse-ring {
          position: absolute;
          width: 28px;
          height: 28px;
          border: 2px solid rgba(16, 185, 129, 0.5);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .pulse-dot {
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
        }

        /* ─── STAGE CONTENT ─── */
        .stage-content {
          padding: 16px;
          transition: all 0.2s ease;
        }

        .stage-content-locked {
          opacity: 0.6;
          pointer-events: none;
        }

        /* ─── STAGE PROGRESS ─── */
        .stage-progress {
          margin-bottom: 12px;
        }

        .progress-bar-container {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 8px;
          transition: width 0.5s ease;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }

        .progress-bar.progress-referral {
          background: linear-gradient(90deg, #f59e0b, #d97706);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }

        .progress-text {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 12px;
        }

        .progress-count {
          font-weight: 700;
          color: white;
        }

        .progress-label {
          color: rgba(255, 255, 255, 0.5);
        }

        .stage-description {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.5;
        }

        /* ─── WITHDRAWAL WINDOW INFO ─── */
        .withdrawal-window-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .window-item {
          padding: 12px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          text-align: center;
        }

        .window-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .window-value {
          font-size: 14px;
          font-weight: 700;
          color: #10b981;
        }

        /* ─── WITHDRAWAL STATUS ─── */
        .withdrawal-status {
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .withdrawal-status.status-open {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .withdrawal-status.status-closed {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .status-open-dot {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
        }

        .status-closed-dot {
          background: #fbbf24;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
        }

        .status-text {
          color: #fff;
        }

        /* ─── SUCCESS/INFO MESSAGES ─── */
        .success-message,
        .info-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .success-message {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .success-message p {
          margin: 0;
        }

        .info-message {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }

        .info-message p {
          margin: 0;
        }

        /* ─── STAGE FOOTER ─── */
        .stage-footer {
          padding: 12px 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .stage-action-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          color: #10b981;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .stage-action-link:hover {
          background: rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        /* ─── MODAL ACTIONS ─── */
        .modal-actions {
          padding: 16px;
          border-top: 1px solid rgba(16, 185, 129, 0.15);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn {
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }

        .btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.4);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        /* ─── SCROLLBAR ─── */
        .stages-container::-webkit-scrollbar {
          width: 6px;
        }

        .stages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .stages-container::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 3px;
        }

        .stages-container::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </>
  )
}
