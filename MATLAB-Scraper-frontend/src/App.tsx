import React, { useState } from 'react';
import { Search, Loader2, ExternalLink, Filter, Code2, Download } from 'lucide-react';
import type { Question } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnlyUnupdated, setShowOnlyUnupdated] = useState(false);

  const fetchQuestions = async (term: string) => {
    if (!term.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:3000/api/questions?term=${encodeURIComponent(term)}`);
      const data = await response.json();
      
      if (data.success) {
        setQuestions(data.data);
      } else {
        setError('Failed to fetch questions');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions(searchTerm);
  };

  const filteredQuestions = showOnlyUnupdated
    ? questions.filter(q => q.published === q.updated)
    : questions;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
   // Add title
   doc.setFontSize(20);
   doc.setTextColor(41, 84, 155);
   doc.text('MathWorks Questions Report', 14, 22);
   
   // Add search info
   doc.setFontSize(12);
   doc.setTextColor(100);
   doc.text(`Search Term: "${searchTerm}"`, 14, 32);
   doc.text(`Total Questions: ${filteredQuestions.length}`, 14, 39);
   doc.text(`Filter: ${showOnlyUnupdated ? 'Unupdated Questions Only' : 'All Questions'}`, 14, 46);
   
   // Add timestamp
   doc.setFontSize(10);
   doc.setTextColor(130);
   doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 53);
   
   // Add horizontal line
   doc.setDrawColor(200);
   doc.line(14, 56, 196, 56);
   
   // Helper function to split text into lines
   const splitTextToFitWidth = (text: string, maxWidth: number) => {
     const words = text.split(' ');
     const lines: string[] = [];
     let currentLine = words[0];

     for (let i = 1; i < words.length; i++) {
       const word = words[i];
       const width = doc.getStringUnitWidth(currentLine + ' ' + word) * doc.getFontSize();
       
       if (width < maxWidth) {
         currentLine += ' ' + word;
       } else {
         lines.push(currentLine);
         currentLine = word;
       }
     }
     lines.push(currentLine);
     return lines;
   };
   
   // Prepare table data
   const tableData = filteredQuestions.map(q => [
     {
       content: q.title,
       link: q.link
     },
     formatDate(q.published),
     formatDate(q.updated),
     q.author?.name || 'Anonymous',
     q.content.substring(0, 100) + '...'
   ]);
   
   // Add table
   autoTable(doc, {
     startY: 60,
     head: [['Title', 'Published', 'Updated', 'Author', 'Content Preview']],
     body: tableData,
     headStyles: {
       fillColor: [41, 84, 155],
       textColor: 255,
       fontSize: 10,
       fontStyle: 'bold'
     },
     bodyStyles: {
       fontSize: 9,
       textColor: 50,
       cellPadding: 3,
       lineColor: [200, 200, 200],
       lineWidth: 0.1
     },
     columnStyles: {
       0: { cellWidth: 65 },
       1: { cellWidth: 25 },
       2: { cellWidth: 25 },
       3: { cellWidth: 25 },
       4: { cellWidth: 45 }
     },
     alternateRowStyles: {
       fillColor: [245, 247, 250]
     },
     margin: { top: 60, left: 14, right: 14 },
     didDrawCell: function(data) {
       // Add clickable links to titles
       if (data.section === 'body' && data.column.index === 0 && data.cell.raw) {
         const { content, link } = data.cell.raw as { content: string; link: string };
         
         // Clear the cell's existing content
         const width = data.cell.width;
         const height = data.cell.height;
         doc.setFillColor(data.row.index % 2 === 0 ? 255 : 245, data.row.index % 2 === 0 ? 255 : 247, data.row.index % 2 === 0 ? 255 : 250);
         doc.rect(data.cell.x, data.cell.y, width, height, 'F');
         
         // Add the link
         doc.setTextColor(41, 84, 155);
         doc.setFontSize(9);
         
         // Split text into lines that fit the cell width
         const maxWidth = width - 4; // Account for padding
         const lines = splitTextToFitWidth(content, maxWidth);
         
         // Calculate total text height
         const lineHeight = doc.getTextDimensions('M').h * 1.2;
         const totalTextHeight = lineHeight * lines.length;
         
         // Calculate starting Y position to vertically center all lines
         let yPosition = data.cell.y + (height - totalTextHeight) / 2 + lineHeight;
         
         // Draw each line
         lines.forEach(line => {
           doc.textWithLink(
             line,
             data.cell.x + 2,
             yPosition,
             { url: link }
           );
           yPosition += lineHeight;
         });
       }
     },
     didDrawPage: function(data) {
       // Add page number at the bottom
       doc.setFontSize(10);
       doc.setTextColor(130);
       doc.text(
         `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
         data.settings.margin.left,
         doc.internal.pageSize.height - 10
       );
     }
   });
    
    // Save the PDF
    doc.save(`mathworks-questions-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      <div className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-center justify-center gap-3 mb-12">
          <Code2 className="h-10 w-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            MathWorks Questions Search
          </h1>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full px-4 py-3 pl-11 text-lg border border-gray-200 rounded-xl 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                           bg-white/70 backdrop-blur-sm transition-all duration-200
                           placeholder:text-gray-400"
                />
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 
                         focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                         disabled:opacity-50 transition-all duration-200
                         shadow-md hover:shadow-lg disabled:hover:shadow-md
                         text-lg font-medium min-w-[120px]"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Search'
                )}
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 px-1">
                <Filter className="h-5 w-5 text-blue-500" />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showOnlyUnupdated}
                    onChange={(e) => setShowOnlyUnupdated(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-base">Show only questions that haven't been updated</span>
                </label>
              </div>
              
              {filteredQuestions.length > 0 && (
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 
                           hover:bg-blue-100 rounded-lg transition-colors duration-200"
                >
                  <Download className="h-5 w-5" />
                  <span>Download PDF</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {error && (
          <div className="p-4 mb-8 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {filteredQuestions.map((question) => (
            <div 
              key={question.id} 
              className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg 
                       border border-gray-100 hover:shadow-xl transition-shadow 
                       duration-200"
            >
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                  {question.title}
                </h2>
                <a
                  href={question.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 
                           rounded-lg transition-colors duration-200"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                <p className="flex items-center">
                  <span className="font-medium text-gray-700">Published:</span>
                  <span className="ml-1.5">{formatDate(question.published)}</span>
                </p>
                <p className="flex items-center">
                  <span className="font-medium text-gray-700">Updated:</span>
                  <span className="ml-1.5">{formatDate(question.updated)}</span>
                </p>
                {question.author && (
                  <p className="flex items-center">
                    <span className="font-medium text-gray-700">Author:</span>
                    <a 
                      href={question.author.uri} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-1.5 text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {question.author.name}
                    </a>
                  </p>
                )}
              </div>
              
              <div className="mt-4 prose prose-blue prose-sm max-w-none">
                {question.content}
              </div>
            </div>
          ))}
          
          {!loading && !error && filteredQuestions.length === 0 && searchTerm && (
            <div className="text-center py-16">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 shadow-lg inline-block">
                <p className="text-lg text-gray-600">
                  No questions found. Try a different search term.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white/80 backdrop-blur-sm border-t border-gray-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-600" />
              <p className="text-gray-600">
                Published for: <span className="font-semibold">idk what</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="https://in.mathworks.com/matlabcentral/answers/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                MATLAB Answers
              </a>
              <span className="text-gray-300">|</span>
              <a 
                href="https://www.mathworks.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                MathWorks
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
