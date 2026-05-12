import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { usersApi, authApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types';

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
  error: '#EF4444',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ── Interest Chip ──────────────────────────────────────────────────────────────
function InterestChip({ label }: { label: string }) {
  return (
    <View style={styles.interestChip}>
      <Text style={styles.interestChipText}>{label}</Text>
    </View>
  );
}

// ── Day Chip ───────────────────────────────────────────────────────────────────
function DayChip({ day, active }: { day: string; active: boolean }) {
  return (
    <View style={[styles.dayChip, active && styles.dayChipActive]}>
      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
    </View>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={16} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Skeleton Profile ───────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        <View style={[styles.avatar, styles.skeleton]} />
        <View style={[styles.skeletonText, { width: 160, height: 22, marginTop: 12 }]} />
        <View style={[styles.skeletonText, { width: 100, height: 14, marginTop: 8 }]} />
        <View style={[styles.skeletonText, { width: 220, height: 14, marginTop: 8 }]} />
      </View>
      <View style={styles.section}>
        <View style={[styles.skeletonText, { width: 100, height: 16, marginBottom: 12 }]} />
        <View style={styles.chipsRow}>
          {[80, 60, 90, 70].map((w, i) => (
            <View key={i} style={[styles.skeletonText, { width: w, height: 30, borderRadius: 15 }]} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getProfile(),
    select: (res) => (res.data?.data ?? res.data) as User,
  });

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await authApi.logout();
            } catch {
              // Ignore server errors — clear locally regardless
            } finally {
              await clearAuth();
              router.replace('/(auth)/welcome' as any);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>Could not load profile.</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userAvailability = new Set(profile.availability ?? []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top section */}
      <View style={styles.topSection}>
        <Avatar name={profile.full_name} />
        <Text style={styles.fullName}>{profile.full_name}</Text>

        {/* City */}
        <View style={styles.cityRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.cityText}>
            {profile.area ? `${profile.area}, ` : ''}{profile.city}
          </Text>
        </View>

        {/* Bio */}
        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : (
          <Text style={[styles.bio, styles.bioEmpty]}>No bio yet. Edit your profile to add one.</Text>
        )}

        {/* Edit Profile button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push('/edit-profile' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={15} color={COLORS.primary} />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.interests?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Interests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.availability?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Days Free</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.activeDot, { backgroundColor: profile.is_active ? COLORS.success : COLORS.textMuted }]} />
          <Text style={styles.statLabel}>{profile.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Interests" icon="heart-outline" />
          <View style={styles.chipsRow}>
            {profile.interests.map((interest) => (
              <InterestChip key={interest} label={interest} />
            ))}
          </View>
        </View>
      )}

      {/* Availability */}
      <View style={styles.section}>
        <SectionHeader title="Availability" icon="calendar-outline" />
        <View style={styles.daysRow}>
          {DAYS.map((day) => (
            <DayChip key={day} day={day} active={userAvailability.has(day)} />
          ))}
        </View>
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <SectionHeader title="Account" icon="person-circle-outline" />
        <View style={styles.accountCard}>
          <View style={styles.accountRow}>
            <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.accountValue} numberOfLines={1}>
              {profile.email}
            </Text>
          </View>
          <View style={styles.accountDivider} />
          <View style={styles.accountRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.accountValue}>
              Member since{' '}
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        disabled={isLoggingOut}
        activeOpacity={0.8}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color={COLORS.error} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Top section
  topSection: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary + '40',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 1,
  },
  fullName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cityText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  bio: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  bioEmpty: {
    opacity: 0.6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 16,
  },
  editBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Section
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  interestChipText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  // Days
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 42,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: COLORS.text,
  },
  // Account card
  accountCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountValue: {
    color: COLORS.textMuted,
    fontSize: 14,
    flex: 1,
  },
  accountDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    backgroundColor: COLORS.error + '10',
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
  // Skeleton
  skeleton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 0,
  },
  skeletonText: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
  },
  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
