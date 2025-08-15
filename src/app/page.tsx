'use client';

import { useState, useEffect, useRef } from 'react';
import { generateBlogTitle } from '@/ai/flows/generate-blog-title';
import { generateBlogOutline } from '@/ai/flows/generate-blog-outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Lightbulb,
  Loader2,
  Save,
  Eye,
  Pencil,
  Download,
  ListOrdered,
  Check,
  Code,
  FileDown,
} from 'lucide-react';
import type { jsPDF } from 'jspdf';
import { Logo } from '@/components/logo';

type View = 'edit' | 'preview';

export default function Home() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState('');
  const [view, setView] = useState<View>('edit');

  const [isTitleGenerating, setIsTitleGenerating] = useState(false);
  const [isOutlineGenerating, setIsOutlineGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('equiprogress_draft');
      if (savedDraft) {
        const { title, content } = JSON.parse(savedDraft);
        setTitle(title || '');
        setContent(content || '');
      }
    } catch (error) {
      console.error("Failed to load draft from local storage", error);
    }
  }, []);
  
  useEffect(() => {
    if (titleTextareaRef.current) {
        titleTextareaRef.current.style.height = 'auto';
        titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title, view]);

  const handleSaveDraft = () => {
    setIsSaving(true);
    try {
      const draft = { title, content };
      localStorage.setItem('equiprogress_draft', JSON.stringify(draft));
    } catch (error) {
       toast({
        title: 'Error saving draft',
        description: 'Could not save draft to local storage.',
        variant: 'destructive',
      });
    }
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  const handleGenerateTitle = async () => {
    if (!keywords) {
      toast({
        title: 'Keywords required',
        description: 'Please enter some keywords to generate a title.',
        variant: 'destructive',
      });
      return;
    }
    setIsTitleGenerating(true);
    try {
      const result = await generateBlogTitle({ keywords });
      if (result.title) {
        setTitle(result.title);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error generating title',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsTitleGenerating(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!title) {
      toast({
        title: 'Title required',
        description: 'Please enter or generate a title first.',
        variant: 'destructive',
      });
      return;
    }
    setIsOutlineGenerating(true);
    try {
      const result = await generateBlogOutline({ title });
      if (result.outline) {
        setContent(currentContent => currentContent ? `${currentContent}\n\n${result.outline}` : result.outline);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error generating outline',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsOutlineGenerating(false);
    }
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleExportMD = () => {
    const mdContent = `# ${title}\n\n${content}`;
    downloadFile(`${(title || 'Untitled').replace(/\s/g, '_')}.md`, mdContent, 'text/markdown');
  };

  const handleExportHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: auto; color: #333; }
    h1 { color: #111; }
    div { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${content}</div>
</body>
</html>`;
    downloadFile(`${(title || 'Untitled').replace(/\s/g, '_')}.html`, htmlContent, 'text/html');
  };
  
  const handleExportPDF = async () => {
    const wasInPreview = view === 'preview';
    if (!wasInPreview) {
      setView('preview');
    }
    
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    setTimeout(async () => {
      const element = previewRef.current;
      if (!element) {
        toast({ title: "Export Error", description: "Preview content not found. Cannot generate PDF.", variant: "destructive" });
        if (!wasInPreview) setView('edit');
        return;
      }

      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#F5F0E1' });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }

        pdf.save(`${(title || 'Untitled').replace(/\s/g, '_')}.pdf`);
      } catch (error) {
        console.error("PDF export failed:", error);
        toast({ title: "Export Error", description: "An unexpected error occurred while generating the PDF.", variant: "destructive" });
      } finally {
        if (!wasInPreview) {
          setView('edit');
        }
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Logo className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-headline font-bold text-foreground tracking-tight">EquiProgress</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" aria-label="Save Draft" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? <Check className="h-5 w-5 text-green-500 animate-pulse" /> : <Save className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label={view === 'edit' ? 'Preview' : 'Edit'} onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}>
                {view === 'edit' ? <Eye className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Export">
                    <Download className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportMD}><FileDown className="mr-2 h-4 w-4" /> Markdown (.md)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportHTML}><Code className="mr-2 h-4 w-4" /> HTML (.html)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" /> PDF (.pdf)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 h-full">
          <main className="lg:col-span-8 xl:col-span-9 h-full">
            <div className="pt-8 lg:px-10 h-full flex flex-col">
              {view === 'edit' ? (
                <div className="flex flex-col gap-2 h-full flex-grow px-4 lg:px-0">
                  <Textarea
                    ref={titleTextareaRef}
                    placeholder="Your Amazing Blog Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl lg:text-4xl font-extrabold font-headline h-auto p-2 border-0 focus-visible:ring-0 shadow-none !bg-transparent resize-none overflow-hidden"
                    rows={1}
                  />
                  <Textarea
                    placeholder="Start writing your masterpiece...&#10;Use Markdown for formatting."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-grow w-full resize-none text-base lg:text-lg leading-relaxed p-2 border-0 focus-visible:ring-0 shadow-none !bg-transparent min-h-[60vh]"
                  />
                </div>
              ) : (
                <div className="p-4 sm:p-6 md:p-8">
                    <div ref={previewRef} className="bg-background p-6 sm:p-8 lg:p-12 rounded-lg max-w-none w-full break-words">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold font-headline mb-8 border-b-2 border-primary/50 pb-4">{title}</h1>
                        <div className="text-lg leading-relaxed" style={{whiteSpace: 'pre-wrap'}}>{content}</div>
                    </div>
                </div>
              )}
            </div>
          </main>

          <aside className="lg:col-span-4 xl:col-span-3 lg:border-l border-primary/20 lg:py-8 lg:pr-4">
             <div className="lg:sticky top-24 p-4 lg:p-0">
                <Card className="shadow-none lg:shadow-md border-0 lg:border bg-primary/5 lg:bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> AI Assistant</CardTitle>
                    <CardDescription>Get a creative boost for your post.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <label htmlFor="keywords" className="text-sm font-medium text-muted-foreground">1. Enter Keywords</label>
                      <Input 
                        id="keywords"
                        placeholder="e.g., sustainable living"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleGenerateTitle} disabled={isTitleGenerating || !keywords}>
                      {isTitleGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                      Generate Title
                    </Button>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">2. Generate Content</label>
                      <Button onClick={handleGenerateOutline} disabled={!title || isOutlineGenerating} variant="outline" className="w-full">
                        {isOutlineGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-2 h-4 w-4" />}
                        Generate Outline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
             </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
