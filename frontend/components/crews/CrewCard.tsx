import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Crew } from '../../types';
import { Avatar } from '../ui/Avatar';

interface CrewCardProps {
  crew: Crew;
}

const STATUS_COLORS: Record<string, string> = {
  forming: '#F59E0B',
  confirmed: '#22C55E',
  completed: '#6B6B80',
};

export function CrewCard({ crew }: CrewCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/crew/${crew.id}` as any)}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.crewName} numberOfLines={1}>{crew.name}</Text>
          {crew.event && (
            <Text style={styles.eventName} numberOfLines={1}>
              <Ionicons name="flash-outline" size={12} color="#9090A0" /> {crew.event.title}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[crew.status] + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[crew.status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLORS[crew.status] }]}>
            {crew.status.charAt(0).toUpperCase() + crew.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Members row */}
      {crew.members && crew.members.length > 0 && (
        <View style={styles.membersRow}>
          {crew.members.slice(0, 4).map((m, i) => (
            <View key={m.id} style={[styles.avatarWrapper, { marginLeft: i === 0 ? 0 : -10 }]}>
              <Avatar name={m.user?.full_name || '?'} url={m.user?.avatar_url} size={32} />
            </View>
          ))}
          {(crew.members.length > 4) && (
            <View style={[styles.avatarWrapper, styles.extraBadge, { marginLeft: -10 }]}>
              <Text style={styles.extraText}>+{crew.members.length - 4}</Text>
            </View>
          )}
          <Text style={styles.memberCount}>
            {crew.members.length}/{crew.max_members} members
          </Text>
        </View>
      )}

      {/* Open Chat button */}
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => router.push(`/crew/${crew.id}` as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FF5A1F" />
        <Text style={styles.chatBtnText}>Open Chat</Text>
        <Ionicons name="chevron-forward" size={16} color="#FF5A1F" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C2E',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  crewName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  eventName: { color: '#9090A0', fontSize: 13, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  membersRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarWrapper: { borderWidth: 2, borderColor: '#1C1C2E', borderRadius: 18 },
  extraBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#252535', justifyContent: 'center', alignItems: 'center',
  },
  extraText: { color: '#9090A0', fontSize: 11, fontWeight: '700' },
  memberCount: { color: '#9090A0', fontSize: 13, marginLeft: 10 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderColor: '#FF5A1F22',
    backgroundColor: '#FF5A1F11', borderRadius: 12, paddingVertical: 11,
  },
  chatBtnText: { color: '#FF5A1F', fontWeight: '700', fontSize: 14, flex: 1, textAlign: 'center' },
});
