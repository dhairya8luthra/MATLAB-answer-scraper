import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXMLAsync = promisify(parseString);
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Helper function to check if entry is within last 48 hours
function isWithin48Hours(dateString) {
  const entryDate = new Date(dateString);
  const now = new Date();
  const diffHours = (now - entryDate) / (1000 * 60 * 60);
  return diffHours <= 48;
}

app.get('/api/questions', async (req, res) => {
  try {
    const { term = '' } = req.query;
    const url = `https://in.mathworks.com/matlabcentral/answers/questions?format=atom&sort=relevance&status=unanswered&term=${encodeURIComponent(term)}`;
    
    const response = await axios.get(url);
    const result = await parseXMLAsync(response.data);
    
    // Extract and process entries
    const entries = result.feed.entry || [];
    
    // Filter out entries within last 48 hours and transform to desired format
    const processedEntries = entries
      .filter(entry => !isWithin48Hours(entry.published[0]))
      .map(entry => ({
        id: entry.id[0].split(':').pop(),
        title: entry.title[0],
        published: entry.published[0],
        updated: entry.updated[0],
        link: entry.link[0].$.href,
        content: entry.content[0],
        author: entry.author ? {
          name: entry.author[0].name[0],
          uri: entry.author[0].uri[0]
        } : null
      }));

    res.json({
      success: true,
      data: processedEntries
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});