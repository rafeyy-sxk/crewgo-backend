import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { chatApi, crewsApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useCrewStore } from '../../stores/crewStore';
import { COLORS } from '../../constants/config';
import { ChatMessage, Crew } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 180);
    const a3 = pulse(dot3, 360);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingWrapper}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiLabel}>🤖 CrewAI</Text>
        <View style={styles.typingDots}>
          {[dot1, dot2, dot3].map((anim, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Message bubbles ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const time = dayjs(message.created_at).format('h:mm A');

  // System message
  if (message.message_type === 'system') {
    return (
      <View style={styles.systemMsgWrapper}>
        <Text style={styles.systemMsgText}>{message.content}</Text>
      </View>
    );
  }

  // AI message
  if (message.message_type === 'ai_message' || message.message_type === 'ai_prompt') {
    return (
      <View style={styles.aiMsgWrapper}>
        <View style={styles.aiBubble}>
          <Text style={styles.aiLabel}>🤖 CrewAI</Text>
          <Text style={styles.aiText}>{message.content}</Text>
          <Text style={styles.aiTimestamp}>{time}</Text>
        </View>
      </View>
    );
  }

  // Regular user message
  const senderName = message.sender?.full_name || 'Unknown';

  return (
    <View style={[styles.msgWrapper, isOwn ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
      {!isOwn && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.timestamp, isOwn ? styles.timestampRight : styles.timestampLeft]}>
        {time}
      </Text>
    </View>
  );
}

// ─── Three-dot menu ───────────────────────────────────────────────────────────

function HeaderMenu({ crewId }: { crewId: string }) {
  const handlePress = () => {
    Alert.alert('Crew Options', '', [
      { text: 'View Members', onPress: () => {} },
      { text: 'Leave Crew', style: 'destructive', onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.menuBtn} activeOpacity={0.7}>
      <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CrewChatScreen() {
  const { id: crewId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addMessage, setMessages, messages: storeMessages } = useCrewStore();

  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const listRef = useRef<FlatList>(null);

  // ── Fetch crew info ─────────────────────────────────────────────────────────
  const { data: crew } = useQuery<Crew>({
    queryKey: ['crew', crewId],
    queryFn: () => crewsApi.get(crewId).then((r) => r.data),
    enabled: !!crewId,
  });

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const { isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['messages', crewId],
    queryFn: async () => {
      const res = await chatApi.getMessages(crewId);
      const msgs: ChatMessage[] = res.data?.messages ?? res.data ?? [];
      setMessages(crewId, msgs);
      return msgs;
    },
    enabled: !!crewId,
    refetchInterval: 8000, // poll every 8 seconds for new messages
  });

  const localMessages: ChatMessage[] = storeMessages[crewId] ?? [];

  // ── Scroll to bottom whenever messages change ───────────────────────────────
  useEffect(() => {
    if (localMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [localMessages.length]);

  // ── Send message mutation ───────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(crewId, content),
    onMutate: (content) => {
      // Optimistically add message
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        crew_id: crewId,
        sender_id: user?.id,
        message_type: 'text',
        content,
        created_at: new Date().toISOString(),
        sender: user
          ? {
              id: user.id,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
            }
          : undefined,
      };
      addMessage(crewId, optimistic);
    },
    onSuccess: (res) => {
      // Replace optimistic with real message
      const real: ChatMessage = res.data;
      setMessages(crewId, [
        ...localMessages.filter((m) => !m.id.startsWith('temp-')),
        real,
      ]);
      queryClient.invalidateQueries({ queryKey: ['messages', crewId] });
    },
    onError: () => {
      Alert.alert('Send failed', 'Could not send message. Please try again.');
    },
  });

  // ── Ask AI mutation ─────────────────────────────────────────────────────────
  const aiMutation = useMutation({
    mutationFn: (message: string) => chatApi.askAI(crewId, message),
    onMutate: (message) => {
      setIsAiTyping(true);
      // Add user's AI prompt message
      const promptMsg: ChatMessage = {
        id: `ai-prompt-${Date.now()}`,
        crew_id: crewId,
        sender_id: user?.id,
        message_type: 'ai_prompt',
        content: `✦ ${message}`,
        created_at: new Date().toISOString(),
        sender: user ? { id: user.id, full_name: user.full_name } : undefined,
      };
      addMessage(crewId, promptMsg);
    },
    onSuccess: (res) => {
      setIsAiTyping(false);
      const aiMsg: ChatMessage = res.data?.message ?? {
        id: `ai-${Date.now()}`,
        crew_id: crewId,
        sender_id: undefined,
        message_type: 'ai_message',
        content: res.data?.content ?? res.data ?? 'Here are my suggestions!',
        created_at: new Date().toISOString(),
      };
      addMessage(crewId, aiMsg);
    },
    onError: () => {
      setIsAiTyping(false);
      Alert.alert('AI Error', 'CrewAI could not respond. Please try again.');
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText('');
    sendMutation.mutate(trimmed);
  }, [inputText, sendMutation]);

  const handleAskAI = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      Alert.alert(
        'Ask CrewAI',
        'Type a question or prompt first, then tap the AI button.',
        [{ text: 'Got it' }]
      );
      return;
    }
    setInputText('');
    aiMutation.mutate(trimmed);
  }, [inputText, aiMutation]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const crewName = crew?.name ?? 'Crew Chat';
  const memberCount = crew?.member_count ?? crew?.members?.length ?? 0;
  const eventName = crew?.event?.title ?? '';

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} isOwn={item.sender_id === user?.id} />
    ),
    [user?.id]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar style="light" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {crewName}
            </Text>
            {memberCount > 0 && (
              <Text style={styles.headerMeta}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                {eventName ? ' · ' : ''}
              </Text>
            )}
            {eventName ? (
              <Text style={styles.headerEventName} numberOfLines={1}>
                {eventName}
              </Text>
            ) : null}
          </View>

          <HeaderMenu crewId={crewId} />
        </View>
      </SafeAreaView>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messagesLoading && localMessages.length === 0 ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={localMessages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyWrapper}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start the conversation or ask CrewAI for ideas!
                </Text>
              </View>
            }
            ListFooterComponent={isAiTyping ? <TypingIndicator /> : null}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message the crew…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={1000}
              style={styles.textInput}
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>

          {/* AI button */}
          <TouchableOpacity
            onPress={handleAskAI}
            disabled={aiMutation.isPending || isAiTyping}
            activeOpacity={0.85}
            style={[
              styles.iconBtn,
              styles.aiBtn,
              (aiMutation.isPending || isAiTyping) && styles.iconBtnDisabled,
            ]}
          >
            {aiMutation.isPending || isAiTyping ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={styles.aiBtnIcon}>✦</Text>
            )}
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
            activeOpacity={0.85}
            style={[
              styles.iconBtn,
              styles.sendBtn,
              (!inputText.trim() || sendMutation.isPending) && styles.iconBtnDisabled,
            ]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.text} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  headerSafe: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerBack: {
    padding: 6,
    borderRadius: 10,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  headerMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  headerEventName: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 1,
    fontWeight: '500',
  },
  menuBtn: {
    padding: 6,
    borderRadius: 10,
  },

  // Loading
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // Messages list
  messageList: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Empty state
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // System message
  systemMsgWrapper: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  systemMsgText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // AI message
  aiMsgWrapper: {
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(139,92,246,0.13)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    padding: 14,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ai,
    marginBottom: 6,
  },
  aiText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  aiTimestamp: {
    color: 'rgba(139,92,246,0.6)',
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },

  // Typing indicator
  typingWrapper: {
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.ai,
  },

  // Regular messages
  msgWrapper: {
    marginVertical: 4,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  msgWrapperRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgWrapperLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.surfaceLight,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: COLORS.text,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    opacity: 0.7,
  },
  timestampRight: {
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  timestampLeft: {
    alignSelf: 'flex-start',
    marginLeft: 2,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  textInput: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.5,
  },
  aiBtn: {
    backgroundColor: COLORS.ai,
    shadowColor: COLORS.ai,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  aiBtnIcon: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
});
