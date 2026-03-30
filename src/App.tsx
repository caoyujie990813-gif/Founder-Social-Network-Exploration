import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  Network, 
  GraduationCap, 
  Briefcase, 
  TrendingUp, 
  ExternalLink, 
  MessageSquare,
  Maximize2,
  Minimize2,
  RefreshCw,
  History,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import mermaid from 'mermaid';
import Markdown from 'react-markdown';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { analyzeFounder, FounderAnalysis } from './services/geminiService';

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#4f46e5',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#312e81',
    lineColor: '#cbd5e1',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#f1f5f9',
    clusterBkg: '#f8fafc',
    clusterBorder: '#e2e8f0',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, sans-serif',
    edgeLabelBackground: '#ffffff',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 20,
    nodeSpacing: 60,
    rankSpacing: 80,
  }
});

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const sanitizeMermaid = (code: string) => {
    let sanitized = code
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/--\s*(.*?)\s*-->/g, '-->|$1|') // Fix arrow labels
      .replace(/<==>/g, '<-->')
      .replace(/--\s*(.*?)\s*--/g, '---| $1 |')
      .trim();

    // Ensure it starts with graph TD if missing
    if (!sanitized.toLowerCase().startsWith('graph')) {
      sanitized = 'graph TD\n' + sanitized;
    }

    // 1. Fix edge labels: -->|text| to -->|"text"|
    sanitized = sanitized.replace(/\|(.*?)\|/g, (match, label) => {
      const cleanLabel = label.trim().replace(/"/g, "'");
      return `|"${cleanLabel}"|`;
    });

    // 2. Fix node labels: wrap in quotes to handle special chars like / ( )
    // Handle different bracket types: (( )), {{ }}, ([ ]), { }, [ ]
    sanitized = sanitized.replace(/(\w+)\(\((.*?)\)\)/g, (match, id, text) => {
      const cleanText = text.trim().replace(/"/g, "'");
      return `${id}(("${cleanText}"))`;
    });
    sanitized = sanitized.replace(/(\w+)\{\{(.*?)\}\}/g, (match, id, text) => {
      const cleanText = text.trim().replace(/"/g, "'");
      return `${id}{{"${cleanText}"}}`;
    });
    sanitized = sanitized.replace(/(\w+)\(\[(.*?)\]\)/g, (match, id, text) => {
      const cleanText = text.trim().replace(/"/g, "'");
      return `${id}(["${cleanText}"])`;
    });
    sanitized = sanitized.replace(/(\w+)\{(.*?)\}/g, (match, id, text) => {
      if (text.includes('"') || text.includes('{')) return match;
      const cleanText = text.trim().replace(/"/g, "'");
      return `${id}{"${cleanText}"}`;
    });
    sanitized = sanitized.replace(/(\w+)\[(.*?)\]/g, (match, id, text) => {
      if (text.includes('"') || text.includes('[')) return match;
      const cleanText = text.trim().replace(/"/g, "'");
      return `${id}["${cleanText}"]`;
    });

    // 3. Inject standard class definitions to ensure rendering even if AI omits them
    const classDefs = `
  classDef founder fill:#4f46e5,stroke:#312e81,stroke-width:4px,color:#fff;
  classDef mentor fill:#f8fafc,stroke:#6366f1,stroke-width:2px,color:#1e293b;
  classDef peer fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,color:#334155;
  classDef investor fill:#ffffff,stroke:#4f46e5,stroke-width:2px,color:#1e293b,stroke-dasharray: 5 5;
    `;

    if (!sanitized.includes('classDef')) {
      sanitized += classDefs;
    }

    return sanitized;
  };

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) {
        setSvg('');
        setError('未提供图谱数据');
        return;
      }
      
      setIsRendering(true);
      setError(null);
      
      try {
        const cleanChart = sanitizeMermaid(chart);
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('图谱渲染失败，数据格式可能不正确');
      } finally {
        setIsRendering(false);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="w-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
        <Network className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm italic">{error}</p>
        <div className="mt-4 w-full max-w-full relative">
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 hover:bg-white transition-all text-slate-500"
            title="复制图谱代码"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="p-4 bg-slate-100 rounded-xl text-[10px] overflow-x-auto text-left font-mono">
            {chart}
          </pre>
        </div>
      </div>
    );
  }

  if (isRendering) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">正在构建关系网络...</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Network className="w-8 h-8 text-slate-300 opacity-20" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">暂无图谱数据</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        centerOnInit={true}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button onClick={() => zoomIn()} className="p-2 bg-white shadow-lg border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><Maximize2 className="w-4 h-4" /></button>
              <button onClick={() => zoomOut()} className="p-2 bg-white shadow-lg border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><Minimize2 className="w-4 h-4" /></button>
              <button onClick={() => resetTransform()} className="p-2 bg-white shadow-lg border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="bg-slate-50/30 rounded-3xl border border-slate-100/50 overflow-hidden cursor-grab active:cursor-grabbing">
              <TransformComponent wrapperClass="!w-full !h-[500px]">
                <div 
                  className="mermaid flex items-center justify-center min-w-full min-h-full p-8"
                  dangerouslySetInnerHTML={{ __html: svg }} 
                />
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default function App() {
  const [founderName, setFounderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FounderAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadingMessages = [
    "正在通过 Google Search 检索公开资料...",
    "正在梳理创始人的学术与师承脉络...",
    "正在深度挖掘社交图谱与核心圈层...",
    "已切换至极速分析引擎，正在加速处理...",
    "正在分析投资机构及合伙人朋友圈...",
    "正在搜集过去一年的媒体访谈与报道...",
    "正在构建专业 Mermaid 人脉网络图谱...",
    "正在生成投研级深度洞察报告...",
    "即将完成，正在进行最后的格式优化..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      // Slower interval for a 120s timeout
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSearch = async (e?: React.FormEvent, name?: string) => {
    if (e) e.preventDefault();
    const targetName = name || founderName;
    if (!targetName.trim()) return;

    console.log("Starting search for:", targetName);
    setIsSearching(true);
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setLoadingStep(0);

    try {
      const result = await analyzeFounder(targetName);
      console.log("Analysis result received");
      setAnalysis(result);
      if (!history.includes(targetName)) {
        setHistory(prev => [targetName, ...prev].slice(0, 5));
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "分析过程中出现错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    console.log("Resetting search");
    setIsSearching(false);
    setAnalysis(null);
    setError(null);
    setFounderName('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.4]"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-50/50 blur-[120px] rounded-full -translate-y-1/4 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-violet-50/50 blur-[120px] rounded-full translate-y-1/4 -translate-x-1/4"></div>
      </div>

      {/* Premium Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={resetSearch}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">FounderGraph</h1>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Intelligence Explorer</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer">
              <History className="w-4 h-4" />
              <span>搜索历史</span>
            </div>
            <button 
              onClick={resetSearch}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all shadow-sm"
            >
              重置视图
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 relative z-10">
        <AnimatePresence>
          {!isSearching ? (
            <motion.div 
              key="search-home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto mt-20 text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6">
                <Sparkles className="w-3 h-3" />
                <span>基于 Gemini 3.1 Pro 强力驱动</span>
              </div>
              <h2 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">
                探索创始人的<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">社交图谱与人脉网络</span>
              </h2>
              <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                输入创始人姓名，深度挖掘其学术师承、大厂同僚、投资朋友圈及核心社交圈层。
              </p>
              
              <form onSubmit={(e) => handleSearch(e)} className="relative group max-w-xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-white rounded-2xl premium-border p-2">
                  <div className="pl-4">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    placeholder="输入创始人姓名，如：印奇、杨植麟..."
                    className="flex-1 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    开始分析
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {history.length > 0 && (
                <div className="mt-12 flex flex-wrap justify-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest w-full mb-2">最近搜索</span>
                  {history.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSearch(undefined, name)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="results-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* Search Header for Result State */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200/60">
                <div 
                  className="cursor-pointer group"
                  onClick={resetSearch}
                >
                  <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">
                    <TrendingUp className="w-3 h-3" />
                    <span>分析报告 / 点击返回</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    {founderName || "创始人分析"}
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </h2>
                </div>
                
                <form onSubmit={(e) => handleSearch(e)} className="flex items-center bg-white rounded-xl premium-border p-1.5 w-full md:w-96">
                  <input
                    type="text"
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    placeholder="重新搜索..."
                    className="flex-1 px-4 py-2 text-sm text-slate-900 focus:outline-none font-medium"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </form>
              </div>

              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-8">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full shadow-inner flex items-center justify-center">
                        <Network className="w-8 h-8 text-indigo-600 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center max-w-sm mx-auto">
                    <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">正在深度挖掘人脉网络</h3>
                    <p className="text-slate-500 text-sm mb-6 min-h-[1.25rem]">{loadingMessages[loadingStep]}</p>
                    
                    <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                    <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      AI 正在进行深度联网检索与图谱构建，预计需要 60-90 秒
                    </p>
                    <button 
                      onClick={() => {
                        setLoading(false);
                        setIsSearching(false);
                      }}
                      className="mt-8 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                      取消分析
                    </button>
                  </div>
                </div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xl shadow-slate-200/50"
                >
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">分析中断</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    {error}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => handleSearch()}
                      className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      重新尝试
                    </button>
                    <button
                      onClick={resetSearch}
                      className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      返回首页
                    </button>
                  </div>
                </motion.div>
              ) : analysis ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Left Column: Graph & Media */}
                  <div className="lg:col-span-7 space-y-10">
                    <section className="bg-white rounded-3xl premium-border overflow-hidden shadow-sm">
                      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg">
                            <Network className="w-5 h-5 text-indigo-600" />
                          </div>
                          <h3 className="font-bold text-slate-900 tracking-tight">人脉关系图谱</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">Interactive</span>
                        </div>
                      </div>
                      <div className="p-8">
                        <MermaidDiagram chart={analysis.mermaid} />
                      </div>
                    </section>

                    <section className="bg-white rounded-3xl premium-border overflow-hidden shadow-sm">
                      <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                        <div className="p-2 bg-amber-50 rounded-lg">
                          <Briefcase className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 tracking-tight">媒体访谈 & 报道精选</h3>
                      </div>
                      <div className="p-8">
                        <div className="markdown-body">
                          <Markdown>{analysis.interviews}</Markdown>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-3xl premium-border overflow-hidden shadow-sm">
                      <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 tracking-tight">基于圈层的访谈建议</h3>
                      </div>
                      <div className="p-8">
                        <div className="markdown-body">
                          <Markdown>{analysis.questions}</Markdown>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Analysis & Sources */}
                  <div className="lg:col-span-5 space-y-10">
                    <section className="bg-white rounded-3xl premium-border overflow-hidden shadow-sm">
                      <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                        <div className="p-2 bg-violet-50 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-violet-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 tracking-tight">核心关系深度解析</h3>
                      </div>
                      <div className="p-8">
                        <div className="markdown-body">
                          <Markdown>{analysis.analysis}</Markdown>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-3xl premium-border overflow-hidden shadow-sm">
                      <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-slate-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 tracking-tight">信息出处与参考资料</h3>
                      </div>
                      <div className="p-4 space-y-1">
                        {analysis.sources.length > 0 ? (
                          analysis.sources.map((source, idx) => (
                            <a
                              key={idx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
                            >
                              <div className="mt-1 p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:border-indigo-200 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                  {source.title}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate mt-1 font-medium">
                                  {source.uri}
                                </p>
                              </div>
                            </a>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <p className="text-sm text-slate-400 italic">正在解析参考链接...</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-slate-400 italic">未找到相关分析数据，请尝试更换搜索词。</p>
                  <button onClick={resetSearch} className="mt-4 text-indigo-600 font-bold text-sm">返回首页</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200/60 py-10 bg-slate-50/50 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">FounderGraph Intelligence</span>
          </div>
          <p className="text-xs font-medium">© 2026 投研专家系统 · 实时人脉网络分析</p>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition-colors">隐私政策</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">服务条款</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">API 文档</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
