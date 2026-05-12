import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useLogin() {
  const { setTokens, setUser } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: async (res) => {
      const { access_token, refresh_token } = res.data;
      await setTokens(access_token, refresh_token);
      const me = await authApi.me();
      setUser(me.data);
      router.replace('/(tabs)/events');
    },
  });
}

export function useRegister() {
  const { setTokens, setUser } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      full_name: string;
      city: string;
    }) => authApi.register(data),
    onSuccess: async (res) => {
      const { access_token, refresh_token } = res.data;
      await setTokens(access_token, refresh_token);
      const me = await authApi.me();
      setUser(me.data);
      router.replace('/(auth)/interests');
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      await clearAuth();
      router.replace('/(auth)/welcome');
    },
  });
}
