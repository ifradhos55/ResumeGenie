import React, { useState, useEffect } from 'react';
import {
  FileText,
  Briefcase,
  Play,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  FileBadge,
  RefreshCw,
  Eye,
  Code,
  Cpu,
  Wand2,
  Send,
  MessageSquare,
  Bot
} from 'lucide-react';

const MOCK_RESUME = `\\documentclass{article}
\\begin{document}
\\section*{Jane Doe}
San Francisco, CA | jane.doe@email.com | (555) 123-4567

\\subsection*{PROFESSIONAL SUMMARY}
Experienced Frontend Developer with 4 years of experience building scalable web applications. Proficient in modern JavaScript, HTML, and CSS. Adept at working in agile environments and collaborating with cross-functional teams to deliver high-quality software.

\\subsection*{SKILLS}
\\begin{itemize}
  \\item \\textbf{Languages:} JavaScript (ES6+), HTML5, CSS3, SASS
  \\item \\textbf{Frameworks:} React.js, Redux, Next.js
  \\item \\textbf{Tools:} Git, Webpack, Jest, React Testing Library, NPM
\\end{itemize}

\\subsection*{EXPERIENCE}
\\textbf{Frontend Developer} | TechCorp Inc. | 2020 - Present
\\begin{itemize}
  \\item Developed scalable user interfaces for e-commerce platforms using React and Redux.
  \\item Architected and integrated GraphQL endpoints for improved data fetching.
  \\item Optimized web page performance, reducing load times by 30\\%.
\\end{itemize}
\\end{document}`;

const MOCK_JOB = `Senior Frontend Engineer (React/TypeScript)

About the Role
We are looking for a Senior Frontend Engineer to join our core product team. You will be responsible for building complex, data-driven web applications using modern web technologies. You will work closely with backend engineers, designers, and product managers to deliver a seamless user experience.

Responsibilities
- Architect and develop new features using React and TypeScript.
- Manage application state using Redux or Zustand.
- Integrate with backend services using GraphQL and Apollo Client.
- Set up and maintain CI/CD pipelines and deploy to cloud platforms like AWS or Vercel.
- Ensure the application meets strict web accessibility (WCAG) standards.
- Mentor junior developers and conduct code reviews.

Qualifications
- 5+ years of experience in frontend development.
- Deep expertise in React and strongly typed languages (TypeScript).
- Experience with state management tools (Redux, Zustand, Context API).
- Familiarity with GraphQL and Apollo Client.
- Experience with cloud platforms (AWS, Vercel, Netlify).
- Strong understanding of web accessibility (a11y) standards.
- Excellent communication skills.
Bonus: Experience with backend technologies like Node.js and frameworks like Next.js.`;

export default function App() {
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [resumeMode, setResumeMode] = useState('edit'); // 'edit' | 'preview' | 'pdf'
  const [resumeFile, setResumeFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported currently.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result.split(',')[1];
      setResumeFile({
        name: file.name,
        mimeType: file.type,
        base64: base64Data
      });
      setResumeMode('pdf');
      setShowRewriteUi(false);
      setResumeText(''); // clear text to avoid confusion
    };
    reader.readAsDataURL(file);
  };

  const [rewritePrompt, setRewritePrompt] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [showRewriteUi, setShowRewriteUi] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const renderLatex = (latex) => {
    if (!latex) return '<p class="text-slate-400 italic">No content to preview.</p>';
    let html = latex;

    // Extract document body if present
    const bodyMatch = html.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (bodyMatch) html = bodyMatch[1];

    // Basic escaping
    html = html.replace(/\\%/g, '%').replace(/\\&/g, '&');

    // Typography
    html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong class="font-bold text-slate-100">$1</strong>');
    html = html.replace(/\\textit\{([^}]+)\}/g, '<em class="italic">$1</em>');

    // Sections
    html = html.replace(/\\section\*?\{([^}]+)\}/g, '<h2 class="text-2xl font-bold mt-6 mb-3 pb-1 border-b border-slate-800 text-slate-100">$1</h2>');
    html = html.replace(/\\subsection\*?\{([^}]+)\}/g, '<h3 class="text-lg font-semibold mt-5 mb-2 text-slate-200">$1</h3>');

    // Lists
    html = html.replace(/\\begin\{itemize\}/g, '<ul class="list-disc pl-6 mb-4 space-y-1.5 text-slate-300">');
    html = html.replace(/\\end\{itemize\}/g, '</ul>');
    html = html.replace(/\\item\s*(.*)/g, '<li>$1</li>');

    // Line breaks
    html = html.replace(/\\\\/g, '<br/>');

    // Clean up empty lines and wrap floating text in paragraphs
    const blocks = html.split(/\n\s*\n/);
    const wrappedBlocks = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('</ul') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p class="mb-3 text-slate-300 leading-relaxed">${trimmed}</p>`;
    });

    return wrappedBlocks.join('\n');
  };

  const loadExample = () => {
    setResumeText(MOCK_RESUME);
    setJobText(MOCK_JOB);
    setResults(null);
    setError(null);
    setResumeFile(null);
    setResumeMode('edit');
  };

  const clearAll = () => {
    setResumeText('');
    setJobText('');
    setResults(null);
    setError(null);
    setChatMessages([]);
    setChatInput('');
    setResumeFile(null);
    setResumeMode('edit');
  };

  const analyzeMatch = async () => {
    if ((!resumeText.trim() && !resumeFile) || !jobText.trim()) return;

    setIsAnalyzing(true);
    setResults(null);
    setError(null);
    setChatMessages([]);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_actual_key_here") {
      setError("Missing API Key. Please add your VITE_GEMINI_API_KEY to the .env file.");
      setIsAnalyzing(false);
      return;
    }

    const prompt = `
      You are an expert technical recruiter and Applicant Tracking System (ATS).
      Analyze the provided resume against the provided job description.
      Evaluate the match and return a JSON object containing:
      - score: An integer from 0 to 100 representing how well the resume matches the job requirements.
      - matched: An array of strings representing the key skills, tools, or requirements found in both.
      - missing: An array of strings representing the key skills, tools, or requirements present in the job description but missing from the resume.
      - advice: A 1-2 sentence summary of your analysis and actionable advice for the candidate.

      ${resumeFile ? "RESUME IS ATTACHED AS PDF DOCUMENT." : `RESUME:\n${resumeText}`}

      JOB DESCRIPTION:
      ${jobText}
    `;

    const parts = [{ text: prompt }];
    if (resumeFile) {
      parts.push({
        inlineData: {
          mimeType: resumeFile.mimeType,
          data: resumeFile.base64
        }
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "INTEGER" },
            matched: { type: "ARRAY", items: { type: "STRING" } },
            missing: { type: "ARRAY", items: { type: "STRING" } },
            advice: { type: "STRING" }
          },
          required: ["score", "matched", "missing", "advice"]
        }
      }
    };

    const fetchWithRetry = async (url, options, maxRetries = 5) => {
      const delays = [1000, 2000, 4000, 8000, 16000];
      for (let i = 0; i < maxRetries; i++) {
        try {
          const res = await fetch(url, options);
          if (res.ok) return res;

          // Improved error logging
          const errorData = await res.json().catch(() => ({}));
          console.error("Gemini API Error Detail:", errorData);
          const errorMessage = errorData.error?.message || `API Error: ${res.status}`;

          if (i === maxRetries - 1) throw new Error(errorMessage);
        } catch (err) {
          if (i === maxRetries - 1) throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    };

    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!resultText) throw new Error("Invalid response from AI");

      const parsedResult = JSON.parse(resultText);
      setResults(parsedResult);
    } catch (err) {
      console.error(err);
      setError("An error occurred while analyzing with Gemini AI. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const rewriteResume = async () => {
    if (!resumeText.trim() || !rewritePrompt.trim()) return;

    setIsRewriting(true);
    setError(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_actual_key_here") {
      setError("Missing API Key. Please add your VITE_GEMINI_API_KEY to the .env file.");
      setIsRewriting(false);
      return;
    }

    const prompt = `
      You are an expert resume writer. The user wants to update their LaTeX resume based on the following instruction:
      "${rewritePrompt}"
      
      CURRENT RESUME (LaTeX):
      ${resumeText}
      
      Respond ONLY with the complete, updated LaTeX code for the resume. 
      Do not include any conversational text. Keep the rest of the document intact, only changing what was requested.
      If you use markdown code blocks, use only \`\`\`latex and \`\`\`.
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const fetchWithRetry = async (url, options, maxRetries = 5) => {
      const delays = [1000, 2000, 4000, 8000, 16000];
      for (let i = 0; i < maxRetries; i++) {
        try {
          const res = await fetch(url, options);
          if (res.ok) return res;

          // Improved error logging
          const errorData = await res.json().catch(() => ({}));
          console.error("Gemini API Error Detail:", errorData);
          const errorMessage = errorData.error?.message || `API Error: ${res.status}`;

          if (i === maxRetries - 1) throw new Error(errorMessage);
        } catch (err) {
          if (i === maxRetries - 1) throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    };

    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!resultText) throw new Error("Invalid response from AI");

      // Strip markdown codeblock backticks if Gemini added them
      resultText = resultText.replace(/^```[a-z]*\n/i, '').replace(/```$/i, '').trim();

      setResumeText(resultText);
      setRewritePrompt('');
      setShowRewriteUi(false);
      setResumeMode('preview'); // Automatically switch to preview to see the magic!
    } catch (err) {
      console.error(err);
      setError("An error occurred while rewriting with Gemini AI. Please try again.");
    } finally {
      setIsRewriting(false);
    }
  };

  const sendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_actual_key_here") {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Error: Missing API Key.' }]);
      return;
    }

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatting(true);

    try {
      const history = chatMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const payload = {
        systemInstruction: {
          parts: [
            {
              text: `You are an expert ATS and technical recruiter assistant. 
Context:
--- RESUME ---
${resumeFile ? "RESUME IS ATTACHED AS PDF DOCUMENT." : resumeText}

--- JOB DESCRIPTION ---
${jobText}

--- MATCH RESULTS ---
Score: ${results?.score || 0}/100
Advice: ${results?.advice || ''}
Matched Keywords: ${results?.matched?.join(', ') || 'None'}
Missing Keywords: ${results?.missing?.join(', ') || 'None'}

Answer the user's questions strictly based on this context. Be helpful, concise, and professional.`
            },
            ...(resumeFile ? [{ inlineData: { mimeType: resumeFile.mimeType, data: resumeFile.base64 } }] : [])
          ]
        },
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] }
        ]
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Chat API Error');

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that.";
      setChatMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getBgColor = (score) => {
    if (score >= 80) return 'bg-emerald-500/10';
    if (score >= 50) return 'bg-amber-500/10';
    return 'bg-rose-500/10';
  };

  const getBorderColor = (score) => {
    if (score >= 80) return 'border-emerald-500/20';
    if (score >= 50) return 'border-amber-500/20';
    return 'border-rose-500/20';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/50">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              Resume Genie
            </h1>
            <p className="text-slate-400 mt-1 max-w-2xl">
              Optimize your resume for applicant tracking systems. Paste your plain text or LaTeX code for your resume and the job description below.<br /><br />
              You can also get this section rewritten for the provided job description by clicking the "Rewrite with AI section" or manually editing the section.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadExample}
              className="px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition-colors flex items-center"
            >
              Try Example
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors flex items-center"
            >
              Clear
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Input Section (Left Side) */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">

            {/* Resume Input */}
            <div className="flex-1 bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden flex flex-col min-h-[400px]">
              <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-200">Your Resume</h2>
                </div>

                {/* View Toggle */}
                <div className="flex flex-wrap sm:flex-nowrap bg-slate-950 p-1 rounded-lg gap-1 mt-2 sm:mt-0">
                  <label className="flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all text-emerald-400/80 animate-pulse hover:text-emerald-300 cursor-pointer">
                    Upload PDF
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button
                    onClick={() => { setResumeMode('edit'); setResumeFile(null); }}
                    className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${resumeMode === 'edit' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    Source
                  </button>
                  <button
                    onClick={() => { setResumeMode('preview'); setResumeFile(null); }}
                    className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${resumeMode === 'preview' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {resumeMode === 'pdf' && resumeFile ? (
                <div className="w-full flex-1 p-6 flex flex-col items-center justify-center bg-slate-900/50">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                     <span className="text-indigo-400 text-xl font-bold">PDF</span>
                  </div>
                  <p className="text-slate-200 font-medium mb-1">{resumeFile.name}</p>
                  <p className="text-slate-500 text-sm mb-6">Ready to analyze with Gemini Flash</p>
                  <button onClick={() => { setResumeMode('edit'); setResumeFile(null); }} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-sm font-medium transition-colors">
                    Remove PDF
                  </button>
                </div>
              ) : resumeMode === 'edit' ? (
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your LaTeX or plain text resume here..."
                  className="w-full flex-1 p-4 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-sm leading-relaxed text-slate-300"
                  spellCheck="false"
                />
              ) : (
                <div
                  className="w-full flex-1 p-6 overflow-y-auto bg-slate-900"
                  dangerouslySetInnerHTML={{ __html: renderLatex(resumeText) }}
                />
              )}

              {/* AI Rewrite Toolbar */}
              {(!resumeFile) && (
                <div className="bg-indigo-500/5 border-t border-slate-800 px-4 py-3">
                {showRewriteUi ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={rewritePrompt}
                      onChange={(e) => setRewritePrompt(e.target.value)}
                      placeholder="e.g., Rewrite the EXPERIENCE section to sound more senior..."
                      className="w-full sm:flex-1 px-3 py-2 text-sm border border-indigo-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-950 text-slate-300 placeholder-slate-600"
                      disabled={isRewriting}
                      onKeyDown={(e) => e.key === 'Enter' && rewriteResume()}
                    />
                    <div className="flex w-full sm:w-auto gap-2">
                      <button
                        onClick={rewriteResume}
                        disabled={isRewriting || !rewritePrompt.trim()}
                        className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center shadow-sm whitespace-nowrap"
                      >
                        {isRewriting ? "Rewriting..." : "Rewrite"}
                      </button>
                      <button
                        onClick={() => setShowRewriteUi(false)}
                        className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                        disabled={isRewriting}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRewriteUi(true)}
                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center w-full justify-center"
                  >
                    Rewrite resume sections with AI
                  </button>
                )}
              </div>
              )}
            </div>

            {/* Job Description Input */}
            <div className="flex-1 bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden flex flex-col min-h-[300px]">
              <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <h2 className="font-semibold text-slate-200">Job Description</h2>
              </div>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full flex-1 p-4 resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-sm leading-relaxed text-slate-300"
                spellCheck="false"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={analyzeMatch}
                disabled={isAnalyzing || (!resumeText.trim() && !resumeFile) || !jobText.trim()}
                className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center transition-all shadow-sm
                  ${isAnalyzing
                    ? 'bg-indigo-500/50 text-white cursor-not-allowed'
                    : (!resumeText.trim() && !resumeFile) || !jobText.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-md'
                  }`}
              >
                {isAnalyzing ? "Analyzing with AI..." : "Analyze with Gemini AI"}
              </button>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Section (Right Side) */}
          <div className="lg:col-span-5 h-full">
            <h2 className="font-bold text-slate-200 mb-2">Results</h2>
            <div className={`bg-slate-900 rounded-xl shadow-sm border border-slate-800 h-full p-6 flex flex-col ${!results && !isAnalyzing ? 'justify-center items-center text-center' : ''}`}>

              {!results && !isAnalyzing && (
                <div className="text-slate-500 flex flex-col items-center max-w-sm mx-auto">
                  <h3 className="text-lg font-medium text-slate-200 mb-2">Ready to Analyze</h3>
                  <p className="text-sm">Paste your resume and the job description on the left, then click "Analyze Match" to see how well you fit the role. The system is using Gemini 2.5 Flash to scan your resume and how closely your resume aligns with the job description</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 animate-pulse">
                  <RefreshCw className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-medium">Extracting keywords & comparing...</p>
                </div>
              )}

              {results && !isAnalyzing && (
                <div className="space-y-8 animate-in fade-in duration-500">

                  {/* Score Ring */}
                  <div className="flex flex-col items-center pt-2">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-slate-800"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className={`${getScoreColor(results.score)} transition-all duration-1000 ease-out`}
                          strokeDasharray={`${results.score}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-bold tracking-tight ${getScoreColor(results.score)}`}>
                          {results.score}%
                        </span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Match Rate</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary / Advice box */}
                  <div className={`p-4 rounded-xl border ${getBgColor(results.score)} ${getBorderColor(results.score)} flex gap-3`}>
                    <Lightbulb className={`w-6 h-6 shrink-0 ${getScoreColor(results.score)}`} />
                    <div>
                      <h4 className={`font-semibold text-sm ${getScoreColor(results.score)}`}>
                        {results.score >= 80 ? 'Excellent Match!' : results.score >= 50 ? 'Good Potential' : 'Needs Optimization'}
                      </h4>
                      <p className="text-sm text-slate-300 mt-1">
                        {results.advice}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* Missing Keywords (Show first because it's actionable) */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        <h3 className="font-semibold text-slate-200">Missing Keywords ({results.missing.length})</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {results.missing.length > 0 ? (
                          results.missing.map((word, i) => (
                            <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-sm font-medium flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              {word}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400 italic">No major keywords missing! Great job.</p>
                        )}
                      </div>
                    </div>

                    {/* Matched Keywords */}
                    <div className="pt-4 border-t border-slate-800/50">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-slate-200">Matched Keywords ({results.matched.length})</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {results.matched.length > 0 ? (
                          results.matched.map((word, i) => (
                            <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {word}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400 italic">No keywords matched. Make sure to tailor your resume.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gemini Chat Section */}
                  <div className="pt-6 border-t border-slate-800/50 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-semibold text-slate-200">Refine for this position with Gemini</h3>
                    </div>

                    <div className="bg-slate-950/30 border border-slate-800 rounded-xl flex flex-col h-[350px]">
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                        {chatMessages.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Bot className="w-10 h-10 mb-3 text-slate-600" />
                            <p className="text-sm font-medium text-slate-400">Ask a follow-up question!</p>
                            <p className="text-xs text-center mt-1 max-w-[200px]">e.g. "How can I incorporate the missing keywords naturally?"</p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm'
                                : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-sm shadow-sm'
                                }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))
                        )}
                        {isChatting && (
                          <div className="flex justify-start">
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input */}
                      <form onSubmit={sendChatMessage} className="p-3 bg-slate-900 border-t border-slate-800 rounded-b-xl flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder="Ask Gemini for advice..."
                          className="flex-1 px-3 py-2.5 text-sm bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          disabled={isChatting}
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isChatting}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
