import { prisma } from '@/lib/prisma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings as Embeddings } from '@langchain/openai';

// Create a utility function for generating CUID
const createId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export class DocumentService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    console.log('Initializing DocumentService...');
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
    });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    console.log('DocumentService initialized');
  }

  async processDocument(expertId: string, filename: string, content: string) {
    console.log('Starting document processing:', { expertId, filename, contentLength: content.length });
    
    try {
      // Create document record
      console.log('Creating document record...');
      const document = await prisma.document.create({
        data: {
          expert: {
            connect: {
              id: expertId
            }
          },
          filename,
          content,
        },
      });
      console.log('Document record created:', document.id);

      // Split text into chunks
      console.log('Splitting text into chunks...');
      const chunks = await this.textSplitter.createDocuments([content]);
      console.log(`Created ${chunks.length} chunks`);

      // Generate embeddings for each chunk
      console.log('Generating embeddings for chunks...');
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.pageContent.length}`);
        
        console.log('Generating embedding...');
        const embedding = await this.embeddings.embedQuery(chunk.pageContent);
        console.log('Embedding generated, length:', embedding.length);
        
        // Format embedding array as a string
        const vectorStr = `[${embedding.join(',')}]`;
        console.log('Saving chunk with embedding to database...');
        
        await prisma.$executeRawUnsafe(
          `INSERT INTO document_chunks (id, document_id, content, embedding, created_at, updated_at)
           VALUES ($1, $2, $3, $4::vector, NOW(), NOW())`,
          createId(),
          document.id,
          chunk.pageContent,
          vectorStr
        );
        console.log(`Chunk ${i + 1} saved successfully`);
      }

      console.log('Document processing completed successfully');
      return document;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Error processing document:', {
        error: errorMessage,
        errorStack,
      });
      throw error;
    }
  }

  async searchSimilarChunks(query: string, expertId: string, limit = 5) {
    console.log('Searching similar chunks:', { query, expertId, limit });
    
    try {
      // Generate embedding for the query
      console.log('Generating query embedding...');
      const queryEmbedding = await this.embeddings.embedQuery(query);
      console.log('Query embedding generated, length:', queryEmbedding.length);

      // Format query vector
      const queryVector = `[${queryEmbedding.join(',')}]`;

      // Find similar chunks using cosine similarity
      console.log('Executing similarity search...');
      const similarChunks = await prisma.$executeRawUnsafe(
        `SELECT dc.*, d.filename, 
                1 - (dc.embedding <=> $1::vector) as similarity
         FROM document_chunks dc
         JOIN documents d ON d.id = dc.document_id
         WHERE d.expert_id = $2
         ORDER BY dc.embedding <=> $1::vector
         LIMIT $3`,
        queryVector,
        expertId,
        limit
      );
      console.log(`Found ${similarChunks.length} similar chunks`);

      return similarChunks;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Error searching similar chunks:', {
        error: errorMessage,
        errorStack,
      });
      throw error;
    }
  }

  async deleteDocument(id: string) {
    console.log('Deleting document:', id);
    try {
      await prisma.document.delete({
        where: { id },
      });
      console.log('Document deleted successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Error deleting document:', {
        error: errorMessage,
        errorStack,
      });
      throw error;
    }
  }
}

export async function searchRelevantChunks(expertId: string, query: string, limit: number = 5): Promise<Array<{ content: string; similarity: number }>> {
  const embedding = await generateEmbedding(query);
  
  // Convert embedding to Postgres vector format
  const vectorString = `[${embedding.join(',')}]`;
  
  // Use cosine similarity to find most relevant chunks
  const chunks = await prisma.$queryRaw`
    SELECT 
      dc.content,
      1 - (dc.embedding <=> ${vectorString}::vector) as similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.expert_id = ${expertId}
    ORDER BY similarity DESC
    LIMIT ${limit};
  `;

  return chunks as Array<{ content: string; similarity: number }>;
}

async function generateEmbedding(query: string) {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
  });
  return await embeddings.embedQuery(query);
}
