import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { formatPaise } from '@/features/payments/bill';
import { nextAction } from '@/features/staff/service';
import { useStaffBoard } from '@/hooks/useStaffBoard';
import { useTheme } from '@/theme';
import { formatTime } from '@/utils/date';

/** The bill in floor words. A host reads "unpaid", not "open". */
const BILL_WORD: Record<string, string> = { open: 'unpaid', paid: 'paid', void: 'voided' };

const STATE_META: Record<string, { label: string; tone: 'positive' | 'warning' | 'neutral' | 'danger' }> = {
  booked: { label: 'Booked', tone: 'neutral' },
  arrived: { label: 'At the door', tone: 'warning' },
  seated: { label: 'Seated', tone: 'positive' },
  done: { label: 'Cleared', tone: 'neutral' },
  'no-show': { label: 'No-show', tone: 'danger' },
};

/**
 * Tonight's floor.
 *
 * Read at arm's length on a stand by somebody holding menus, so the row is
 * built around the three things that decide what they do next: when the table
 * is, where it is in its evening, and whether the kitchen is owed a round. The
 * money is on the row too but quiet — it matters once, at the end.
 *
 * One action per row, not a menu of them. A host mid-service is choosing
 * between tables, not between verbs, and every state has exactly one obvious
 * next move.
 */
export default function StaffScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { board, isLoading, error, refetch, setState, advanceRound } = useStaffBoard();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Tonight" onBack={router.back} />
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Skeleton height={92} />
          <Skeleton height={92} />
          <Skeleton height={92} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Tonight" onBack={router.back} />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const tables = board?.tables ?? [];
  const waiting = tables.reduce((sum, table) => sum + table.roundsWaiting, 0);

  return (
    <Screen>
      <ScreenHeader title="Tonight" onBack={router.back} />

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refetch()} />}
      >
        <View style={styles.summary}>
          <Text variant="body" tone="muted">
            {tables.length} {tables.length === 1 ? 'table' : 'tables'}
          </Text>
          {waiting > 0 ? (
            <Badge label={`${waiting} to the kitchen`} tone="warning" />
          ) : (
            <Badge label="Kitchen clear" tone="positive" />
          )}
        </View>

        {tables.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title="Nothing booked tonight"
            message="Tables appear here as they are booked, and the moment somebody dines in."
          />
        ) : null}

        {tables.map((table) => {
          const meta = STATE_META[table.serviceState] ?? STATE_META.booked;
          const action = nextAction(table.serviceState);

          return (
            <Card key={table.id}>
              <View style={{ gap: theme.spacing.sm }}>
                <View style={styles.row}>
                  <Text variant="numeric" style={{ fontSize: 18 }}>
                    {formatTime(table.time)}
                  </Text>
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {table.guestName} · {table.partySize}
                  </Text>
                  <Badge label={meta.label} tone={meta.tone} />
                </View>

                {table.walkIn ? (
                  <Text variant="caption" tone="faint">
                    Walked in
                  </Text>
                ) : null}

                {table.roundsWaiting > 0 && table.nextRoundId ? (
                  <View style={styles.row}>
                    <Text variant="body" tone="accent" style={{ flex: 1 }}>
                      {table.roundsWaiting} round{table.roundsWaiting === 1 ? '' : 's'} waiting
                    </Text>
                    <Button
                      label="To the kitchen"
                      size="sm"
                      variant="secondary"
                      onPress={() => advanceRound({ id: table.nextRoundId as string, state: 'preparing' })}
                    />
                  </View>
                ) : null}

                <View style={styles.row}>
                  <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                    {table.roundsSent > 0
                      ? `${table.roundsSent} round${table.roundsSent === 1 ? '' : 's'} sent`
                      : 'Nothing ordered yet'}
                    {table.bill ? ` · ${formatPaise(table.bill.total)} ${BILL_WORD[table.bill.status] ?? table.bill.status}` : ''}
                  </Text>

                  {action ? (
                    <Button
                      label={action.label}
                      size="sm"
                      onPress={() => setState({ id: table.id, state: action.to })}
                      accessibilityHint={`Marks this table ${action.to}`}
                    />
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
});
