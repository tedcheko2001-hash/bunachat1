import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';

const newsItems = [
  {
    title: 'Ethiopia Leads African Coffee Export Growth in 2026',
    summary: 'Ethiopian coffee exports have increased by 25% this year, making it the top African exporter.',
    date: '2026-02-06',
    source: 'Ethiopian Monitor',
    url: 'https://ethiopianmonitor.com',
  },
  {
    title: 'New Digital Banking Regulations Announced',
    summary: 'The National Bank of Ethiopia introduces new guidelines for digital payment systems.',
    date: '2026-02-05',
    source: 'Ethiopian Monitor',
    url: 'https://ethiopianmonitor.com',
  },
  {
    title: 'Addis Ababa Tech Hub Attracts International Investment',
    summary: 'Major tech companies are setting up offices in Ethiopia\'s growing tech ecosystem.',
    date: '2026-02-04',
    source: 'Ethiopian Monitor',
    url: 'https://ethiopianmonitor.com',
  },
  {
    title: 'Ethiopian Airlines Expands Routes to South America',
    summary: 'New direct flights connecting Addis Ababa to São Paulo and Buenos Aires.',
    date: '2026-02-03',
    source: 'Ethiopian Monitor',
    url: 'https://ethiopianmonitor.com',
  },
  {
    title: 'Green Energy Initiative Reaches 80% of Rural Areas',
    summary: 'Government renewable energy program brings electricity to millions.',
    date: '2026-02-02',
    source: 'Ethiopian Monitor',
    url: 'https://ethiopianmonitor.com',
  },
];

const NewsPage = () => {
  const navigate = useNavigate();
  const { language } = useApp();

  const openNews = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">{t('news', language)}</h1>
      </header>

      {/* News List */}
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
                  <span>{new Date(news.date).toLocaleDateString()}</span>
                </div>
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
