import {
  Button,
  Checkbox,
  Divider,
  Paper,
  PaperProps,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  useComputedColorScheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { upperFirst } from '@mantine/hooks';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { login, register } from '@/lib/auth';
import { GoogleButton } from './GoogleButton';
import { TwitterButton } from './TwitterButton';

type AuthMode = 'login' | 'register';

type AuthenticationFormProps = PaperProps & {
  mode?: AuthMode;
};

export function AuthenticationForm({ className, mode = 'login', ...props }: AuthenticationFormProps) {
  const isDark = useComputedColorScheme('light') === 'dark';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: {
      email: '',
      name: '',
      password: '',
      terms: true,
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length <= 6 ? 'Password should include at least 6 characters' : null),
    },
  });

  return (
    <Paper
      radius="xl"
      p={{ base: 'xl', sm: 36 }}
      withBorder
      shadow="xl"
      className={`w-full backdrop-blur-sm ${
        isDark ? 'border-slate-700 bg-slate-900/75' : 'border-slate-200 bg-white/95'
      } ${className ?? ''}`}
      {...props}
    >
      <div className="mb-6 space-y-2">
        <Text className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Account Access
        </Text>
        <Text fw={700} className={`text-2xl leading-tight sm:text-[1.85rem] ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </Text>
        <Text size="sm" className={isDark ? 'text-slate-300' : 'text-slate-600'}>
          Use social sign-in or continue with email.
        </Text>
      </div>

      <div className="mb-5 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoogleButton
          radius="md"
          size="md"
          className={`h-11 ${
            isDark
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Google
        </GoogleButton>
        <TwitterButton
          radius="md"
          size="md"
          className={`h-11 ${
            isDark
              ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Twitter
        </TwitterButton>
      </div>

      <Divider
        label="Or continue with email"
        labelPosition="center"
        my="xl"
        styles={{ label: { color: isDark ? '#94a3b8' : '#64748b', opacity: 0.95 } }}
      />

      <form onSubmit={form.onSubmit(async (values) => {
        setError(null);
        setLoading(true);
        try {
          if (mode === 'login') {
            await login(values.email, values.password);
            navigate({ to: '/app/dashboard' });
          } else {
            await register(values.email, values.password, values.name);
            await login(values.email, values.password);
            navigate({ to: '/app/dashboard' });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
          setLoading(false);
        }
      })}>
        <Stack gap="md">
          {error && (
            <Text c="red" size="sm" ta="center">
              {error}
            </Text>
          )}

          {mode === 'register' && (
            <TextInput
              label="Name"
              placeholder="Your name"
              value={form.values.name}
              onChange={(event) => form.setFieldValue('name', event.currentTarget.value)}
              size="md"
              radius="md"
            />
          )}

          <TextInput
            required
            label="Email"
            placeholder="hello@mantine.dev"
            value={form.values.email}
            onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
            error={form.errors.email && 'Invalid email'}
            size="md"
            radius="md"
          />

          <PasswordInput
            required
            label="Password"
            placeholder="Your password"
            value={form.values.password}
            onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
            error={form.errors.password && 'Password should include at least 6 characters'}
            size="md"
            radius="md"
          />

          {mode === 'register' && (
            <Checkbox
              label="I accept terms and conditions"
              checked={form.values.terms}
              onChange={(event) => form.setFieldValue('terms', event.currentTarget.checked)}
              size="md"
            />
          )}
        </Stack>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={mode === 'register' ? '/auth/login' : '/auth/register'}
            className={`text-left text-sm ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {mode === 'register'
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </Link>
          <Button type="submit" radius="md" size="md" className="h-11 px-8" loading={loading}>
            {upperFirst(mode)}
          </Button>
        </div>
      </form>
    </Paper>
  );
}
