import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import { useMemo, useState } from 'react';

type NewsItem = {
  title: string;
  summary: string;
  source: string;
  url: string;
};

const buildTodaysNews = (): NewsItem[] => [
  {
    title: 'Ethiopia Today – Breaking News & Headlines',
    summary: 'Latest breaking news across Ethiopia updated throughout the day.',
    source: 'Addis Standard',
    url: 'https://addisstandard.com/',
  },
  {
    title: 'Business, Economy & Coffee Market Updates',
    summary: 'Today\'s coverage of Ethiopian business, banking, and coffee export markets.',
    source: 'The Reporter Ethiopia',
    url: 'https://www.thereporterethiopia.com/',
  },
  {
    title: 'Politics & Government News',
    summary: 'Current political developments and government announcements.',
    source: 'Ethiopian Monitor',
    url: 'https://ethiopianmonitor.com/',
  },
  {
    title: 'Regional & African Affairs',
    summary: 'Ethiopia in the Horn of Africa – latest regional stories.',
    source: 'BBC Africa',
    url: 'https://www.bbc.com/news/world/africa',
  },
  {
    title: 'Ethiopia – Latest from Reuters',
    summary: 'Verified international reporting on Ethiopian events today.',
    source: 'Reuters',
    url: 'https://www.reuters.com/world/africa/',
  },
  {
    title: 'Fana Broadcasting – Local Coverage',
    summary: 'Local Ethiopian news, sports, and culture updates.',
    source: 'Fana BC',
    url: 'https://www.fanabc.com/english/',
  },
  {
    title: 'Ethiopian News Agency (ENA)',
    summary: 'Official state news wire — updated continuously.',
    source: 'ENA',
    url: 'https://www.ena.et/en/',
  },
];

const NewsPage = () => {
  const navigate = useNavigate();
  const { language } = useApp();
  const [refreshKey, setRefreshKey] = useState(0);

  const today = useMemo(() => new Date(), [refreshKey]);
  const newsItems = useMemo(() => buildTodaysNews(), [refreshKey]);

  const openNews = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg flex-1">{t('news', language)}</h1>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      <div className="px-4 pt-3 text-xs text-muted-foreground">
        Live sources · {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      <div className="p-4 space-y-4">
        {newsItems.map((news, idx) => (
          <button
            key={idx}
            onClick={() => openNews(news.url)}
            className="w-full buna-card p-4 text-left hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">
                  {news.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {news.summary}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <span>{news.source}</span>
                  <span>•</span>
                  <span>{today.toLocaleDateString()}</span>
                </div>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                  Open source website <ExternalLink size={12} />
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

export default NewsPage;
