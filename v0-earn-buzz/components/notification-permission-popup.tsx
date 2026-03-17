'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { copyToClipboard, formatDiagnosticJSON } from '@/lib/pwa-notification-utils';
import type { DiagnosticPayload } from '@/lib/pwa-notification-utils';

interface NotificationPermissionPopupProps {
  isOpen: boolean;
  permission: NotificationPermission | null;
  diagnostic: DiagnosticPayload | null;
  onClose: () => void;
  onEnableNotifications: () => void;
  onCheckStatus: () => void;
  isLoading?: boolean;
  showHelperButtons?: boolean;
}

export function NotificationPermissionPopup({
  isOpen,
  permission,
  diagnostic,
  onClose,
  onEnableNotifications,
  onCheckStatus,
  isLoading = false,
  showHelperButtons = true,
}: NotificationPermissionPopupProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getStatusConfig = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <Check className="h-5 w-5" />,
          title: 'Notifications Enabled',
          description: 'You will receive notifications from this app.',
          variant: 'default' as const,
          badgeText: 'Granted',
          badgeVariant: 'default' as const,
        };
      case 'denied':
        return {
          icon: <BellOff className="h-5 w-5" />,
          title: 'Notifications Blocked',
          description:
            'Notifications are disabled. Please enable in browser settings.',
          variant: 'destructive' as const,
          badgeText: 'Denied',
          badgeVariant: 'destructive' as const,
        };
      default:
        return {
          icon: <Bell className="h-5 w-5" />,
          title: 'Notification Permission Required',
          description: 'Allow notifications to stay updated with alerts.',
          variant: 'default' as const,
          badgeText: 'Not Set',
          badgeVariant: 'secondary' as const,
        };
    }
  };

  const status = getStatusConfig();

  const handleCopyDiagnostics = async () => {
    if (!diagnostic) return;

    const json = formatDiagnosticJSON(diagnostic);
    const success = await copyToClipboard(json);

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderIOSGuidance = () => {
    if (!diagnostic?.isIOS) return null;

    if (!diagnostic.isStandalone) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            iOS Safari Tab Mode: Add this app to Home Screen first. Open Safari share menu → Add to Home Screen.
          </AlertDescription>
        </Alert>
      );
    }

    if (permission === 'denied') {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            iOS Settings Path: Settings → Notifications → [App Name] → Allow Notifications.
            Also check: Settings → Safari → Notifications.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{status.title}</CardTitle>
            <Badge variant={status.badgeVariant}>{status.badgeText}</Badge>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            {status.icon}
            <span>{status.description}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {renderIOSGuidance()}

          {showHelperButtons && (
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={onEnableNotifications}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Enable Notifications'}
              </Button>
              <Button
                onClick={onCheckStatus}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                Check Notification Status
              </Button>
            </div>
          )}

          {diagnostic && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Diagnostics</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDiagnostics}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40 overflow-y-auto">
                {formatDiagnosticJSON(diagnostic)}
              </pre>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
