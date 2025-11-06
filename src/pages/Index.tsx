import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface TestImage {
  id: string;
  url: string;
  name: string;
  reactions: number[];
  averageReaction?: number;
}

interface TestSession {
  id: string;
  timestamp: Date;
  imageId: string;
  imageName: string;
  reactionTime: number;
  key: string;
}

const SAMPLE_IMAGES: TestImage[] = [
  { id: '1', url: '/placeholder.svg', name: 'Изображение 1', reactions: [] },
  { id: '2', url: '/placeholder.svg', name: 'Изображение 2', reactions: [] },
  { id: '3', url: '/placeholder.svg', name: 'Изображение 3', reactions: [] },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const [images, setImages] = useState<TestImage[]>(SAMPLE_IMAGES);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  
  const [displayTime, setDisplayTime] = useState(500);
  const [testKey, setTestKey] = useState('Space');
  const [repetitions, setRepetitions] = useState(3);
  
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testPhase, setTestPhase] = useState<'waiting' | 'showing' | 'flash' | 'ready'>('waiting');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentRepetition, setCurrentRepetition] = useState(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [testSequence, setTestSequence] = useState<TestImage[]>([]);

  const calculateAverageReaction = (reactions: number[]) => {
    if (reactions.length === 0) return 0;
    return Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);
  };

  const generateTestSequence = useCallback(() => {
    const sequence: TestImage[] = [];
    images.forEach(img => {
      for (let i = 0; i < repetitions; i++) {
        sequence.push(img);
      }
    });
    return sequence.sort(() => Math.random() - 0.5);
  }, [images, repetitions]);

  const startTest = () => {
    if (images.length === 0) {
      toast.error('Добавьте хотя бы одно изображение');
      return;
    }
    
    const sequence = generateTestSequence();
    setTestSequence(sequence);
    setCurrentImageIndex(0);
    setCurrentRepetition(0);
    setIsTestRunning(true);
    setTestPhase('waiting');
    setActiveTab('test');
    
    setTimeout(() => {
      runNextTrial(sequence, 0);
    }, 1000);
  };

  const runNextTrial = (sequence: TestImage[], index: number) => {
    if (index >= sequence.length) {
      completeTest();
      return;
    }

    setCurrentImageIndex(index);
    setTestPhase('showing');
    
    setTimeout(() => {
      setTestPhase('flash');
      setTestStartTime(Date.now());
      
      setTimeout(() => {
        setTestPhase('ready');
      }, 100);
    }, displayTime);
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isTestRunning || testPhase !== 'ready') return;
    
    if (e.code === testKey || e.key === ' ' && testKey === 'Space') {
      const reactionTime = Date.now() - testStartTime;
      const currentImage = testSequence[currentImageIndex];
      
      const session: TestSession = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        imageId: currentImage.id,
        imageName: currentImage.name,
        reactionTime,
        key: testKey
      };
      
      setSessions(prev => [...prev, session]);
      
      setImages(prev => prev.map(img => {
        if (img.id === currentImage.id) {
          return { ...img, reactions: [...img.reactions, reactionTime] };
        }
        return img;
      }));
      
      setTestPhase('waiting');
      
      setTimeout(() => {
        runNextTrial(testSequence, currentImageIndex + 1);
      }, 800);
    }
  }, [isTestRunning, testPhase, testStartTime, currentImageIndex, testSequence, testKey]);

  const completeTest = () => {
    setIsTestRunning(false);
    setTestPhase('waiting');
    toast.success('Тест завершен!');
    setActiveTab('results');
  };

  const getRankedImages = (fastest: boolean) => {
    const imagesWithAvg = images
      .filter(img => img.reactions.length > 0)
      .map(img => ({
        ...img,
        averageReaction: calculateAverageReaction(img.reactions)
      }));
    
    return fastest 
      ? imagesWithAvg.sort((a, b) => a.averageReaction - b.averageReaction)
      : imagesWithAvg.sort((a, b) => b.averageReaction - a.averageReaction);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: TestImage = {
          id: `${Date.now()}-${Math.random()}`,
          url: event.target?.result as string,
          name: file.name,
          reactions: []
        };
        setImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
    
    toast.success('Изображения загружены');
  };

  const deleteImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    toast.success('Изображение удалено');
  };

  const progress = testSequence.length > 0 
    ? (currentImageIndex / testSequence.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-3">
            <Icon name="Timer" size={40} className="text-primary" />
            Система тестирования визуальной реакции
          </h1>
          <p className="text-slate-600 text-lg">Профессиональная платформа для психометрических исследований</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 h-auto p-1">
            <TabsTrigger value="settings" className="flex items-center gap-2 py-3">
              <Icon name="Settings" size={18} />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2 py-3">
              <Icon name="Image" size={18} />
              <span className="hidden sm:inline">База картинок</span>
            </TabsTrigger>
            <TabsTrigger value="test" disabled={!isTestRunning} className="flex items-center gap-2 py-3">
              <Icon name="Play" size={18} />
              <span className="hidden sm:inline">Тестирование</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2 py-3">
              <Icon name="BarChart3" size={18} />
              <span className="hidden sm:inline">Результаты</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 py-3">
              <Icon name="History" size={18} />
              <span className="hidden sm:inline">История</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Settings" size={24} />
                  Параметры тестирования
                </CardTitle>
                <CardDescription>
                  Настройте время показа изображений и клавишу ответа
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Время показа изображения: {displayTime} мс</Label>
                  <Slider
                    value={[displayTime]}
                    onValueChange={(val) => setDisplayTime(val[0])}
                    min={100}
                    max={2000}
                    step={100}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Рекомендуется: 300-800 мс для визуальных стимулов
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Количество повторений каждой картинки</Label>
                  <Slider
                    value={[repetitions]}
                    onValueChange={(val) => setRepetitions(val[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Текущее значение: {repetitions} повторений
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-key" className="text-base">Клавиша ответа</Label>
                  <Input
                    id="test-key"
                    value={testKey}
                    onChange={(e) => setTestKey(e.target.value || 'Space')}
                    placeholder="Space"
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Нажмите любую клавишу или используйте Space (пробел)
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={startTest} 
                    disabled={images.length === 0 || isTestRunning}
                    size="lg"
                    className="w-full"
                  >
                    <Icon name="PlayCircle" size={20} className="mr-2" />
                    Начать тестирование
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="FolderOpen" size={24} />
                  Управление изображениями
                </CardTitle>
                <CardDescription>
                  Загрузите изображения для тестирования
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={uploadImage}
                      className="cursor-pointer"
                    />
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {images.length} изображений
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    {images.map((img) => (
                      <Card key={img.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-square bg-slate-100 relative">
                          <img 
                            src={img.url} 
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => deleteImage(img.id)}
                          >
                            <Icon name="Trash2" size={16} />
                          </Button>
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium truncate">{img.name}</p>
                          {img.reactions.length > 0 && (
                            <Badge variant="outline" className="mt-2">
                              {img.reactions.length} тестов
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="animate-fade-in">
            <Card className="min-h-[600px] flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Процесс тестирования</CardTitle>
                  <Badge variant="secondary">
                    {currentImageIndex + 1} / {testSequence.length}
                  </Badge>
                </div>
                <Progress value={progress} className="mt-2" />
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                {testPhase === 'waiting' && (
                  <div className="text-center space-y-4">
                    <Icon name="Timer" size={64} className="mx-auto text-muted-foreground animate-pulse" />
                    <p className="text-2xl text-muted-foreground">Приготовьтесь...</p>
                  </div>
                )}

                {testPhase === 'showing' && testSequence[currentImageIndex] && (
                  <div className="w-full max-w-2xl aspect-square animate-scale-in">
                    <img 
                      src={testSequence[currentImageIndex].url}
                      alt="Test"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {testPhase === 'flash' && (
                  <div className="w-full h-[600px] bg-white animate-pulse"></div>
                )}

                {testPhase === 'ready' && (
                  <div className="text-center space-y-4">
                    <Icon name="Zap" size={64} className="mx-auto text-primary animate-pulse" />
                    <p className="text-3xl font-bold text-primary">Нажмите {testKey}!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="animate-fade-in">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="TrendingUp" size={24} />
                    Статистика реакций
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-secondary rounded-lg p-6 text-center">
                      <Icon name="Image" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-3xl font-bold text-primary">
                        {images.filter(img => img.reactions.length > 0).length}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Протестировано изображений</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-6 text-center">
                      <Icon name="Activity" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-3xl font-bold text-primary">{sessions.length}</p>
                      <p className="text-sm text-muted-foreground mt-1">Всего измерений</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-6 text-center">
                      <Icon name="Clock" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-3xl font-bold text-primary">
                        {sessions.length > 0 
                          ? Math.round(sessions.reduce((sum, s) => sum + s.reactionTime, 0) / sessions.length)
                          : 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Среднее время (мс)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <Icon name="Zap" size={24} />
                      Самый быстрый отклик
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getRankedImages(true).slice(0, 5).map((img, index) => (
                        <div key={img.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:shadow-md transition-shadow">
                          <Badge className="bg-green-500">{index + 1}</Badge>
                          <img src={img.url} alt={img.name} className="w-12 h-12 object-cover rounded" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{img.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {img.reactions.length} измерений
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{img.averageReaction} мс</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Icon name="Snail" size={24} />
                      Наибольшая задержка
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getRankedImages(false).slice(0, 5).map((img, index) => (
                        <div key={img.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:shadow-md transition-shadow">
                          <Badge className="bg-orange-500">{index + 1}</Badge>
                          <img src={img.url} alt={img.name} className="w-12 h-12 object-cover rounded" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{img.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {img.reactions.length} измерений
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-600">{img.averageReaction} мс</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="FileText" size={24} />
                  Журнал тестов
                </CardTitle>
                <CardDescription>
                  Полная история всех измерений
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Нет данных</p>
                  ) : (
                    sessions.slice().reverse().map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary transition-colors">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">
                            {new Date(session.timestamp).toLocaleTimeString('ru-RU')}
                          </Badge>
                          <span className="font-medium">{session.imageName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="font-mono bg-primary">{session.reactionTime} мс</Badge>
                          <Badge variant="secondary">{session.key}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
