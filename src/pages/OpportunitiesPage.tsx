import { ArrowLeft, ExternalLink, MapPin, Building, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';

const opportunities = [
  {
    title: 'Senior Software Engineer',
    company: 'Safaricom Ethiopia',
    location: 'Addis Ababa',
    type: 'Full-time',
    posted: '2026-02-05',
    url: 'https://ethiojobs.net/jobs',
  },
  {
    title: 'Marketing Manager',
    company: 'Ethio Telecom',
    location: 'Addis Ababa',
    type: 'Full-time',
    posted: '2026-02-04',
    url: 'https://ethiojobs.net/jobs',
  },
  {
    title: 'Finance Analyst',
    company: 'Commercial Bank of Ethiopia',
    location: 'Addis Ababa',
    type: 'Full-time',
    posted: '2026-02-04',
    url: 'https://ethiojobs.net/jobs',
  },
  {
    title: 'UX Designer',
    company: 'Ride Ethiopia',
    location: 'Addis Ababa',
    type: 'Full-time',
    posted: '2026-02-03',
    url: 'https://ethiojobs.net/jobs',
  },
  {
    title: 'Project Manager',
    company: 'UNDP Ethiopia',
    location: 'Addis Ababa',
    type: 'Contract',
    posted: '2026-02-02',
    url: 'https://ethiojobs.net/jobs',
  },
  {
    title: 'Data Scientist',
    company: 'Awash Bank',
    location: 'Addis Ababa',
    type: 'Full-time',
    posted: '2026-02-01',
    url: 'https://ethiojobs.net/jobs',
  },
  {
    title: 'HR Specialist',
    company: 'Ethiopian Airlines',
    location: 'Addis Ababa',
    type: 'Full-time',
    posted: '2026-01-31',
    url: 'https://ethiojobs.net/jobs',
  },
];

const OpportunitiesPage = () => {
  const navigate = useNavigate();
  const { language } = useApp();

  const openJob = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">{t('opportunities', language)}</h1>
      </header>

      {/* Job List */}
      <div className="p-4 space-y-4">
        {opportunities.map((job, idx) => (
          <button
            key={idx}
            onClick={() => openJob(job.url)}
            className="w-full buna-card p-4 text-left hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building size={14} />
                    <span>{job.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>Posted {new Date(job.posted).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  {job.type}
                </span>
              </div>
              <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default OpportunitiesPage;
