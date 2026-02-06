import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, ChevronRight, ChevronLeft, Check, BookOpen, 
  Coffee, Award
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

const StudyBunaPage = () => {
  const navigate = useNavigate();
  const { user, language } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('study_courses')
      .select('*')
      .order('order_index');

    if (!error && data) {
      setCourses(data);
    }
    setLoading(false);
  };

  const fetchProgress = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('completed', true);

    if (!error && data) {
      setCompletedLessons(new Set(data.map(p => p.lesson_id)));
    }
  };

  const selectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setCurrentLessonIndex(0);

    const { data, error } = await supabase
      .from('study_lessons')
      .select('*')
      .eq('course_id', course.id)
      .order('order_index');

    if (!error && data) {
      setLessons(data);
    }
  };

  const completeLesson = async () => {
    if (!user || !lessons[currentLessonIndex]) return;

    const lessonId = lessons[currentLessonIndex].id;

    await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    setCompletedLessons(prev => new Set([...prev, lessonId]));

    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (selectedCourse) {
      setSelectedCourse(null);
      setLessons([]);
    } else {
      navigate(-1);
    }
  };

  const getProgressPercentage = (courseId: string) => {
    // This would need actual lesson count per course
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">
          {selectedCourse ? selectedCourse.title : t('studyBuna', language)}
        </h1>
      </header>

      {!selectedCourse ? (
        /* Course List */
        <div className="p-4 space-y-4">
          <div className="text-center py-6">
            <span className="text-6xl">☕️</span>
            <h2 className="text-xl font-semibold mt-4">Learn Ethiopian Coffee Culture</h2>
            <p className="text-muted-foreground mt-2">
              Explore the rich traditions of Ethiopian Buna
            </p>
          </div>

          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => selectCourse(course)}
              className="w-full buna-card p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BookOpen size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.description}
                  </p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Lesson View */
        <div className="p-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            {lessons.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full ${
                  idx <= currentLessonIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {lessons.length > 0 && (
            <div className="buna-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Coffee size={20} className="text-primary" />
                <span className="text-sm text-muted-foreground">
                  Lesson {currentLessonIndex + 1} of {lessons.length}
                </span>
              </div>

              <h2 className="text-xl font-semibold mb-4">
                {lessons[currentLessonIndex].title}
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                {lessons[currentLessonIndex].content}
              </p>

              {completedLessons.has(lessons[currentLessonIndex].id) && (
                <div className="flex items-center gap-2 mt-4 text-primary">
                  <Check size={20} />
                  <span className="text-sm font-medium">Completed</span>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentLessonIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentLessonIndex === 0}
                >
                  <ChevronLeft size={20} />
                  Previous
                </Button>

                {currentLessonIndex < lessons.length - 1 ? (
                  <Button
                    className="flex-1"
                    onClick={completeLesson}
                  >
                    Next
                    <ChevronRight size={20} />
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={completeLesson}
                  >
                    <Award size={20} />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default StudyBunaPage;
