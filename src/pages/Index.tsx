import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { AppLayout } from '@/components/AppLayout';

const IndexContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <AppLayout />;
};

const Index = () => {
  return (
    <AuthProvider>
      <IndexContent />
    </AuthProvider>
  );
};

export default Index;
