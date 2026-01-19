import { AgentResponse, AgentType, Message } from '../types';
import { taxState } from '../state/taxState';
import { executiveAgent } from './executiveAgent';
import { explanationAgent } from './explanationAgent';
import { deductionsAgent } from './deductionsAgent';
import { investmentsAgent } from './investmentsAgent';
import { stateTaxesAgent } from './stateTaxesAgent';
import { simulateWebSearch } from '../tools/webSearchSimulator';
import { streamText } from '../utils/streamText';

export class AgentOrchestrator {
  private currentAgent: AgentType = 'executive';
  private activeStream: { cancel: () => void } | null = null;

  async processMessage(
    userMessage: string,
    onStreamUpdate?: (messageId: string, content: string, isComplete: boolean) => void
  ): Promise<Message[]> {
    const messages: Message[] = [];

    // Cancel any active stream
    if (this.activeStream) {
      this.activeStream.cancel();
      this.activeStream = null;
    }

    // Add user message (never streamed)
    messages.push({
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Get current taxpayer state
    const taxpayerState = taxState.getTaxpayerState();

    // Route to appropriate agent
    let response: AgentResponse & { useWebSearch?: boolean; searchQuery?: string };
    let agent = this.currentAgent;

    do {
      switch (agent) {
        case 'executive':
          response = await executiveAgent.process(userMessage);
          break;
        case 'explanation':
          response = await explanationAgent.process(userMessage, taxpayerState);
          break;
        case 'deductions':
          response = await deductionsAgent.process(userMessage, taxpayerState);
          break;
        case 'investments':
          response = await investmentsAgent.process(userMessage, taxpayerState);
          break;
        case 'stateTaxes':
          response = await stateTaxesAgent.process(userMessage, taxpayerState);
          break;
        default:
          response = await executiveAgent.process(userMessage);
      }

      // Handle web search if needed
      let searchResults;
      if (response.useWebSearch && response.searchQuery) {
        // Create status message for searching (add immediately so it shows up)
        const searchStatusId = this.generateId();
        const searchStatusMessage: Message = {
          id: searchStatusId,
          role: 'system',
          content: '',
          timestamp: new Date(),
          agentType: response.agentType,
          statusText: 'Searching the web for the latest guidance…',
        };
        messages.push(searchStatusMessage);
        
        // Add to taxState immediately so it shows in UI
        if (onStreamUpdate) {
          taxState.addMessage(searchStatusMessage);
        }

        // Perform search
        searchResults = await simulateWebSearch(response.searchQuery);

        // Update status message with search results
        const statusMessageIndex = messages.findIndex(m => m.id === searchStatusId);
        if (statusMessageIndex !== -1) {
          messages[statusMessageIndex].searchResults = searchResults;
          messages[statusMessageIndex].statusText = undefined;
          messages[statusMessageIndex].content = ''; // Keep empty, response will follow
        }
        
        // Update in taxState if message was added
        taxState.updateMessage(searchStatusId, {
          searchResults,
          statusText: undefined,
        });
      }

      // Create system response message
      const systemMessageId = this.generateId();
      const systemMessage: Message = {
        id: systemMessageId,
        role: 'system',
        content: '', // Start empty, will be filled by streaming
        timestamp: new Date(),
        agentType: response.agentType,
        actions: response.actions,
        searchResults: searchResults,
        isStreaming: true,
      };

      messages.push(systemMessage);

      // Stream the response (if not an error and not a user message)
      const shouldStream = onStreamUpdate && 
                          response.content && 
                          !response.content.includes('error') &&
                          !response.content.includes('I\'m sorry');

      if (shouldStream) {
        // Add message to state first with empty content
        if (onStreamUpdate && typeof onStreamUpdate === 'function') {
          taxState.addMessage(systemMessage);
        }

        this.activeStream = streamText(response.content, {
          onChunk: (chunk, isComplete) => {
            onStreamUpdate(systemMessageId, chunk, isComplete);
            if (isComplete) {
              // Update message to remove streaming flag and add monetization
              taxState.updateMessage(systemMessageId, {
                isStreaming: false,
                monetizationSuggestion: response.monetizationSuggestion,
              });
              this.activeStream = null;
            }
          },
          chunkDelay: response.agentType === 'executive' && response.content.includes('successfully filed') ? 80 : 50,
        });
      } else {
        // No streaming for errors or simple responses
        systemMessage.isStreaming = false;
        systemMessage.content = response.content;
        systemMessage.monetizationSuggestion = response.monetizationSuggestion;
      }

      // Move to next agent if needed
      if (response.shouldContinue && response.nextAgent) {
        agent = response.nextAgent;
        userMessage = ''; // Clear for next iteration
      } else {
        break;
      }
    } while (response.shouldContinue);

    this.currentAgent = agent;
    return messages;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const agentOrchestrator = new AgentOrchestrator();
