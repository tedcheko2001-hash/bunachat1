import { ArrowLeft, ExternalLink, Building, Calendar, RefreshCw, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import { useMemo, useState } from 'react';

type Opportunity = {
  title: string;
  source: string;
  description: string;
  url: string;
};

const buildTodaysOpportunities = (): Opportunity[] => [
  {
    title: 'EthioJobs – All Latest Jobs in Ethiopia',
    source: 'ethiojobs.net',
    description: 'The largest job board in Ethiopia. New listings posted daily.',
    url: 'https://www.ethiojobs.net/',
  },
  {
    title: 'HaHu Jobs – Fresh Vacancies',
    source: 'hahu.jobs',
    description: 'Updated daily with private-sector, NGO, and tech vacancies.',
    url: 'https://hahu.jobs/',
  },
  {
    title: 'ShegerJobs – Ethiopia Vacancies',
    source: 'shegerjobs.com',
    description: 'Government and private company job openings across Ethiopia.',
    url: 'https://shegerjobs.com/',
  },
  {
    title: 'HarmeeJobs – Freelance & Full-time',
    source: 'harmeejobs.com',
    description: 'Latest Ethiopian job announcements refreshed continuously.',
    url: 'https://harmeejobs.com/',
  },
  {
    title: 'UN Jobs in Ethiopia',
    source: 'unjobs.org',
    description: 'UN, UNDP, WHO, UNICEF and international NGO vacancies in Ethiopia.',
    url: 'https://unjobs.org/duty_stations/ethiopia',
  },
  {
    title: 'ReliefWeb – NGO & Humanitarian Jobs',
    source: 'reliefweb.int',
    description: 'Humanitarian, development and NGO opportunities in Ethiopia.',
    url: 'https://reliefweb.int/country/eth?advanced-search=%28C79%29&list=jobs',
  },
  {
    title: 'LinkedIn Jobs – Ethiopia',
    source: 'linkedin.com',
    description: 'Live LinkedIn job postings filtered for Ethiopia.',
    url: 'https://www.linkedin.com/jobs/search/?location=Ethiopia',
  },
  {
    title: 'Ethiopian Airlines – Careers',
    source: 'ethiopianairlines.com',
    description: 'Official career portal — current openings updated regularly.',
    url: 'https://corporate.ethiopianairlines.com/careers',
  },
];

const OpportunitiesPage = () => {
  const navigate = useNavigate();
  const { language } = useApp();
  const [refreshKey, setRefreshKey] = useState(0);

  const today = useMemo(() => new Date(), [refreshKey]);
  const opportunities = useMemo(() => buildTodaysOpportunities(), [refreshKey]);

  const openJob = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg flex-1">{t('opportunities', language)}</h1>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      <div className="px-4 pt-3 text-xs text-muted-foreground flex items-center gap-2">
        <Calendar size={12} />
        Updated {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

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
                <p className="text-sm text-muted-foreground mb-2">{job.description}</p>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building size={14} />
                    <span>{job.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={14} />
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline underline-offset-2 truncate max-w-[220px]"
                    >
                      {job.url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  Open source <ExternalLink size={12} />
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
