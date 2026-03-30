import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FounderAnalysis {
  mermaid: string;
  analysis: string;
  questions: string;
  interviews: string;
  sources: { title: string; uri: string }[];
}

export async function analyzeFounder(founderName: string): Promise<FounderAnalysis> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("分析请求超时。由于人脉挖掘涉及深度联网搜索，请尝试刷新或稍后重试。")), 180000)
  );

  try {
    const analysisPromise = (async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `你是一位专业的人际关系网络投研专家。请深度分析创始人 ${founderName} 的 Pedigree（血统/师承）和 Social Graph（社交图谱）。
        
        请务必通过 Google Search 检索以下信息：
        1. 创始人的教育背景、导师、早期创业伙伴。
        2. 核心投资机构及对应的合伙人。
        3. 过去一年（2025-2026）的深度采访、播客或公开报道。

        必须包含以下五个部分，且每个部分必须以相应的标题开头：
        1. MERMAID GRAPH: 一个专业的 Mermaid 流程图（graph TD）。
           - **必须** 为每个节点分配类别（class），语法为：NodeId(("姓名")):::founder。
           - 创始人节点：NodeId(("姓名")):::founder
           - 导师/师承：NodeId{{"姓名"}}:::mentor
           - 同僚/伙伴：NodeId(["姓名"]):::peer
           - 投资人/资本：NodeId{"姓名"}:::investor
           - 严格连线语法：'A -->|"关系"| B'。
           - **必须**：所有节点标签和连线标签必须包裹在双引号中。
           - **必须**：在图表末尾包含以下样式定义：
             classDef founder fill:#4f46e5,stroke:#312e81,stroke-width:4px,color:#fff;
             classDef mentor fill:#f8fafc,stroke:#6366f1,stroke-width:2px,color:#1e293b;
             classDef peer fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,color:#334155;
             classDef investor fill:#ffffff,stroke:#4f46e5,stroke-width:2px,color:#1e293b,stroke-dasharray: 5 5;
        
        2. ## 核心解析
           深度解析其导师、同僚、投资人和所属圈层。请提供详尽的分析。
        3. ## 访谈建议
           基于其社交圈层，为访谈者提供 3-5 个深度访谈问题建议。
        4. ## 媒体访谈
           搜集并列出该创始人过去一年（2025-2026）的深度采访、报道、播客或公开演讲。如果没找到，请根据其背景推测其可能参与的活动。
        5. ## 参考来源
           列出所有参考的网页链接。
        
        严格格式要求：
        - 将 Mermaid 图表放在 \`\`\`mermaid 代码块中。
        - 所有分析内容必须使用中文。`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      if (!response.text) {
        throw new Error("AI 未返回任何有效内容，请重试。");
      }
      return response;
    })();

    const response = await Promise.race([analysisPromise, timeoutPromise]);
    const text = response.text;
    console.log("AI Response Text Length:", text.length);
    if (text.length < 100) {
      console.warn("AI response seems too short:", text);
    }
  
  // 1. Extract Mermaid
  const mermaidMatch = text.match(/```mermaid\s*([\s\S]*?)\s*```/i);
  let mermaidStr = "";
  if (mermaidMatch) {
    mermaidStr = mermaidMatch[1].trim();
  } else {
    const fallbackMatch = text.match(/(?:graph|flowchart)\s+(?:TD|LR|TB|BT|RL)[\s\S]*?(?=\n\n|#|$)/i);
    if (fallbackMatch) mermaidStr = fallbackMatch[0].trim();
  }

  // 2. Extract Sections with improved robustness
  const getSection = (title: string, nextTitles: string[] = []) => {
    // Match any level of header (#, ##, ###), bold (**), or numbered list (1., 2.)
    // followed by the title. Handles optional colon and whitespace.
    const headerRegex = new RegExp(`(?:^|\\n)(?:[#*\\s\\d\\.]*)${title}[:：\\s]*`, 'i');
    const startMatch = text.match(headerRegex);
    if (!startMatch) return "";
    
    const startIndex = startMatch.index! + startMatch[0].length;
    let endIndex = text.length;
    
    if (nextTitles.length > 0) {
      // Look for any of the next titles as a stopping point
      const nextHeaderRegex = new RegExp(`(?:^|\\n)(?:[#*\\s\\d\\.]*)(?:${nextTitles.join('|')})[:：\\s]*`, 'i');
      const endMatch = text.substring(startIndex).match(nextHeaderRegex);
      if (endMatch) {
        endIndex = startIndex + endMatch.index!;
      }
    }
    
    return text.substring(startIndex, endIndex).trim();
  };

  const analysis = getSection("核心解析", ["访谈建议", "媒体访谈", "参考来源"]) || 
                   getSection("核心解析", []) ||
                   text.split(/(?:^|\n)(?:[#*\\s\d\.]*)(?:访谈建议|媒体访谈|参考来源)[:：\s]*/i)[0]
                       .replace(/```mermaid[\s\S]*?```/i, "")
                       .trim();

  const questions = getSection("访谈建议", ["媒体访谈", "参考来源"]) || getSection("访谈建议", []);
  
  const interviews = getSection("媒体访谈", ["参考来源"]) || getSection("媒体访谈", []);

  // 3. Extract Sources from grounding metadata AND text
  const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title || "来源",
    uri: chunk.web?.uri || ""
  })).filter(s => s.uri) || [];

  // Also try to parse sources from the text itself if AI listed them
  const textSourcesPart = getSection("参考来源", []);
  const textSources: { title: string; uri: string }[] = [];
  if (textSourcesPart) {
    const lines = textSourcesPart.split('\n');
    lines.forEach(line => {
      const urlMatch = line.match(/\[(.*?)\]\((https?:\/\/.*?)\)/) || line.match(/(https?:\/\/[\w\d\-\.\/\?\=\&\%]+)/);
      if (urlMatch) {
        textSources.push({
          title: urlMatch[1] || "参考链接",
          uri: urlMatch[2] || urlMatch[1]
        });
      }
    });
  }

  // Combine and deduplicate
  const allSources = [...groundingSources, ...textSources];
  const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());

  return {
    mermaid: mermaidStr,
    analysis: analysis || "未生成分析内容",
    questions: questions || "未生成建议问题",
    interviews: interviews || "未找到近期相关访谈报道",
    sources: uniqueSources
  };
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
}
