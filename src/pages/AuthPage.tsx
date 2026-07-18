import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp, t } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, EyeOff, Coffee } from 'lucide-react';
import bunaChatLogoAsset from '@/assets/bunachat-logo.jpg.asset.json';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
});

const AuthPage = () => {
  const navigate = useNavigate();
  const { language } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, name });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        err.errors.forEach(e => {
          const field = e.path[0] as keyof typeof errors;
          newErrors[field] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Please verify your email before logging in');
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success('Welcome back!');
        navigate('/home');
      } else {
        const redirectUrl = `${window.location.origin}/home`;
        
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: name.trim(),
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please login instead.');
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Create profile
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase.from('profiles').insert({
            user_id: authData.user.id,
            name: name.trim(),
            email: email.trim(),
          });
        }

        toast.success('Account created! Please check your email to verify.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={bunaChatLogoAsset.url} alt="Buna Chat" className="w-24 h-24 rounded-2xl shadow-buna mb-4" />
          <h1 className="font-script text-4xl text-primary">Buna Chat</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Coffee size={16} />
            Nu Buna Tetu ☕️
          </p>
        </div>

        {/* Form Card */}
        <div className="buna-card p-6">
          <div className="flex mb-6 bg-muted rounded-xl p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('login', language)}
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                !isLogin ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('signup', language)}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {t('name', language)}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-buna"
                  placeholder="Enter your name"
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t('email', language)}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-buna"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t('password', language)}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-buna pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-lg rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                isLogin ? t('login', language) : t('signup', language)
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-6">
          from <span className="brand-gradient-text">Teds Online Company</span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
