import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../services/api';
import { useCrewStore } from '../stores/crewStore';
import { ChatMessage } from '../types';

export function useMessages(crewId: string) {
  const { setMessages } = useCrewStore();

  return useQuery({
    queryKey: ['messages', crewId],
    queryFn: async () => {
      const res = await chatApi.getMessages(crewId);
      const msgs: ChatMessage[] = res.data.messages || [];
      setMessages(crewId, msgs);
      return msgs;
    },
    enabled: !!crewId,
    refetchInterval: 5000, // poll every 5s for new messages
  });
}

export function useSendMessage(crewId: string) {
  const { addMessage } = useCrewStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(crewId, content),
    onSuccess: (res) => {
      addMessage(crewId, res.data);
      queryClient.invalidateQueries({ queryKey: ['messages', crewId] });
    },
  });
}

export function useAskAI(crewId: string) {
  const { addMessage } = useCrewStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => chatApi.askAI(crewId, message),
    onSuccess: (res) => {
      addMessage(crewId, res.data);
      queryClient.invalidateQueries({ queryKey: ['messages', crewId] });
    },
  });
}
