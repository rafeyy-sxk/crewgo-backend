import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { crewsApi } from '../../services/api';
import type { Crew, CrewMember } from '../../types';

// ── Constants ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#FF5A1F',
  background: '#0F0F1A',
  surface: '#1C1C2E',
  surfaceLight: '#252535',
  text: '#FFFFFF',
  textMuted: '#9090A0',
  border: '#2A2A3E',
  success: '#22C55E',
  ai: '#8B5CF6',
  warning: '#F59E0B',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_CONFIG: Record<
  Crew['status'],
  { label: string; color: string; bg: string }
> = {
  forming: { label: 'Forming', color: COLORS.warning, bg: COLORS.warning + '20' },
  confirmed: { label: 'Confirmed', color: COLORS.success, bg: COLORS.success + '20' },
  completed: { label: 'Completed', color: COLORS.textMuted, bg: COLORS.surfaceLight },
};

// ── Member Avatars ─────────────────────────────────────────────────────────────
function MemberAvatars({ members, memberCount }: { members?: CrewMember[]; memberCount?: number }) {
  const displayMembers = members?.slice(0, 4) ?? [];
  const extra = (memberCount ?? members?.length ?? 0) - displayMembers.length;

  if (displayMembers.length === 0 && !memberCount) {
    return (
      <View style={styles.memberRow}>
        <Text style={styles.memberCountText}>No members yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.memberRow}>
      {displayMembers.map((m, idx) => {
        const name = m.user?.full_name ?? 'User';
        const initials = getInitials(name);
        const avatarColors = ['#FF5A1F', '#8B5CF6', '#22C55E', '#F59E0B'];
        return (
          <View
            key={m.id}
            style={[
              styles.memberAvatar,
              { backgroundColor: avatarColors[idx % avatarColors.length], marginLeft: idx > 0 ? -8 : 0 },
            ]}
          >
            <Text style={styles.memberAvatarText}>{initials}</Text>
          </View>
        );
      })}
      {extra > 0 && (
        <View style={[styles.memberAvatar, styles.memberAvatarExtra, { marginLeft: -8 }]}>
          <Text style={styles.memberAvatarText}>+{extra}</Text>
        </View>
      )}
      {memberCount != null && (
        <Text style={styles.memberCountText}>
          {' '}
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

// ── Crew Card ──────────────────────────────────────────────────────────────────
interface CrewCardProps {
  crew: Crew;
}

function CrewCard({ crew }: CrewCardProps) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[crew.status] ?? STATUS_CONFIG.forming;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.crewName} numberOfLines={1}>
            {crew.name}
          </Text>
          {crew.event?.title && (
            <View style={styles.eventRow}>
              <Ionicons name="flash-outline" size={12} color={COLORS.primary} />
              <Text style={styles.eventName} numberOfLines={1}>
                {crew.event.title}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Members */}
      <MemberAvatars members={crew.members} memberCount={crew.member_count ?? crew.members?.length} />

      {/* Divider */}
      <View style={styles.divider} />

      {/* Chat button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => router.push(`/crew/${crew.id}` as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles-outline" size={16} color={COLORS.primary} />
        <Text style={styles.chatButtonText}>Open Chat</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} style={styles.chatChevron} />
      </TouchableOpacity>
    </View>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={72} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No crews yet</Text>
      <Text style={styles.emptySubtitle}>
        Show interest in an event and we'll match you with a crew automatically.
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={() => router.push('/(tabs)/events' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="flash" size={16} color={COLORS.text} />
        <Text style={styles.discoverButtonText}>Discover Events</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function CrewsScreen() {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['myCrews'],
    queryFn: () => crewsApi.myCrews(),
    select: (res) => (res.data?.data ?? res.data ?? []) as Crew[],
  });

  const crews: Crew[] = data ?? [];

  const renderItem = useCallback(({ item }: { item: Crew }) => <CrewCard crew={item} />, []);
  const keyExtractor = useCallback((item: Crew) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Crews</Text>
        {crews.length > 0 && (
          <View style={styles.crewCountBadge}>
            <Text style={styles.crewCountText}>{crews.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your crews…</Text>
        </View>
      ) : (
        <FlatList
          data={crews}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            crews.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  crewCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  crewCountText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  crewName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventName: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  memberAvatarExtra: {
    backgroundColor: COLORS.surfaceLight,
  },
  memberAvatarText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  memberCountText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  // Chat button
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  chatChevron: {
    marginLeft: 'auto',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 4,
  },
  discoverButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
