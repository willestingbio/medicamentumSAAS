'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, LinkIcon, Unplug } from 'lucide-react';
import { getGoogleCalendarEvents, disconnectCalendar } from '@/lib/actions/calendar';
import { toast } from 'sonner';

type CalendarEvent = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
  location?: string | null;
  hangoutLink?: string | null;
};

function formatEventDate(date: Date | string) {
  const now = new Date();
  const eventDate = new Date(date);
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays < 7) return `En ${diffDays} días`;

  return eventDate.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

function formatEventTime(date: Date | string) {
  return new Date(date).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CalendarWidgetProps {
  events: CalendarEvent[];
  googleConnected?: boolean;
  userId?: string;
}

export function CalendarWidget({ events, googleConnected = false, userId }: CalendarWidgetProps) {
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(googleConnected);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setLoading(true);
      getGoogleCalendarEvents()
        .then((res) => {
          setGoogleEvents(res.events);
          setIsConnected(res.connected);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isConnected]);

  const allEvents = [...events, ...googleEvents]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 8);

  const handleDisconnect = async () => {
    try {
      await disconnectCalendar();
      setIsConnected(false);
      setGoogleEvents([]);
      toast.success('Calendario desconectado');
    } catch {
      toast.error('Error al desconectar');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          Próximos eventos
        </CardTitle>
        {isConnected && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <LinkIcon className="size-2.5" />
            Google
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {allEvents.length === 0 && !loading ? (
          <div className="py-6 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              No tienes eventos programados.
            </p>
            {userId && !isConnected && (
              <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
                <a href={`/api/auth/calendar?userId=${userId}`}>
                  <LinkIcon className="size-3.5" />
                  Conectar Google Calendar
                </a>
              </Button>
            )}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-center">
                  <div>
                    <p className="text-[10px] font-medium leading-none text-primary">
                      {formatEventDate(event.startsAt)}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEventTime(event.startsAt)}
                    {event.endsAt && ` — ${formatEventTime(event.endsAt)}`}
                  </p>
                  {event.hangoutLink && (
                    <a
                      href={event.hangoutLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                    >
                      <ExternalLink className="size-2.5" />
                      Unirse
                    </a>
                  )}
                </div>
              </div>
            ))}

            {isConnected && (
              <div className="pt-2 flex justify-end">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleDisconnect}>
                  <Unplug className="size-3" />
                  Desconectar
                </Button>
              </div>
            )}

            {!isConnected && userId && (
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <a href={`/api/auth/calendar?userId=${userId}`}>
                    <LinkIcon className="size-3.5" />
                    Conectar Google Calendar
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
