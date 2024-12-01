import { prisma } from '@/lib/prisma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document as LangchainDocument } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export class DocumentService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(apiKey: string) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-ada-002',
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async processDocument(expertId: string, filename: string, content: string) {
    try {
      console.log('Processing document:', { expertId, filename });

      // Create document record
      const document = await prisma.document.create({
        data: {
          expertId,
          filename,
          content,
        },
      });

      console.log('Document created:', document.id);

      // Split text into chunks
      const docs = await this.textSplitter.createDocuments([content]);
      console.log('Created chunks:', docs.length);

      // Process each chunk
      for (const doc of docs) {
        const embedding = await this.embeddings.embedQuery(doc.pageContent);
        console.log('Generated embedding for chunk');
        
        await prisma.documentChunk.create({
          data: {
            documentId: document.id,
            content: doc.pageContent,
            embedding: embedding as any, // Prisma doesn't have proper types for vector
          },
        });
      }

      console.log('Document processing completed');
      return document;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async searchSimilarChunks(expertId: string, query: string, limit = 5) {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Use PostgreSQL's vector similarity search
      const similarChunks = await prisma.$queryRaw`
        SELECT dc.content, dc.id,
               1 - (dc.embedding <=> ${queryEmbedding}::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE d.expert_id = ${expertId}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      return similarChunks;
    } catch (error) {
      console.error('Error searching similar chunks:', error);
      throw error;
    }
  }
}
