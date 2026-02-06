import { ArrowLeft, Eye, Lock, Shield, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

const PrivacyPage = () => {
  const navigate = useNavigate();

  const privacySettings = [
    {
      icon: Eye,
      title: 'Profile Visibility',
      description: 'Control who can see your profile',
      value: 'Everyone',
    },
    {
      icon: Lock,
      title: 'Last Seen',
      description: 'Show when you were last online',
      value: 'On',
    },
    {
      icon: Shield,
      title: 'Read Receipts',
      description: 'Let others know when you read their messages',
      value: 'On',
    },
    {
      icon: UserX,
      title: 'Blocked Users',
      description: 'Manage your blocked list',
      value: '0 blocked',
    },
  ];

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">Privacy</h1>
      </header>

      <div className="p-4">
        <div className="buna-card overflow-hidden">
          {privacySettings.map((setting, idx) => (
            <button
              key={setting.title}
              className={`w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left ${
                idx > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <setting.icon size={20} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">{setting.title}</p>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <span className="text-sm text-primary font-medium">{setting.value}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-xl">
          <h3 className="font-medium mb-2">Your Data</h3>
          <p className="text-sm text-muted-foreground">
            Your email and personal information are kept private and secure. 
            We never share your data with third parties.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PrivacyPage;
