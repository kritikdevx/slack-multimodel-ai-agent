import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessageChunk } from "@langchain/core/messages";

class AIService {
  private gpt35: ChatOpenAI;
  private gpt4: ChatOpenAI;
  private claude3Sonnet: ChatAnthropic;
  private claude3Haiku: ChatAnthropic;
  private modelSelectorChain: RunnableSequence;
  private modelMap: Record<string, ChatOpenAI | ChatAnthropic>;

  constructor() {
    // Initialize models
    this.gpt35 = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    this.gpt4 = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
    });
    this.claude3Sonnet = new ChatAnthropic({
      modelName: "claude-3-sonnet-20240229",
      temperature: 0.7,
    });

    this.claude3Haiku = new ChatAnthropic({
      modelName: "claude-3-haiku-20240229",
      temperature: 0.7,
    });

    // Model selection prompt template
    const modelSelectorPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a model router that selects the best AI model for a given query.
        Available models:
          - gpt35 (GPT-3.5 Turbo)
          - gpt4 (GPT-4)
          - claude3Sonnet (Claude-3 Sonnet)
          - claude3Haiku (Claude-3 Haiku)
        
        Respond only with the model name, no explanation.`,
      ],
      ["human", "{input}"],
    ]);

    // Create model selection chain
    this.modelSelectorChain = RunnableSequence.from([
      modelSelectorPrompt,
      this.gpt35, // Using GPT-3.5 to decide the best model
      new StringOutputParser(),
    ]);

    // Model map for dynamic execution
    this.modelMap = {
      gpt35: this.gpt35,
      gpt4: this.gpt4,
      claude3Sonnet: this.claude3Sonnet,
      claude3Haiku: this.claude3Haiku,
    };
  }

  // Select the best model for the input query
  private async selectModel(input: string): Promise<string> {
    const selectedModelName = await this.modelSelectorChain.invoke({ input });
    console.log(`Selected Model: ${selectedModelName}`);
    return selectedModelName in this.modelMap ? selectedModelName : "gpt35"; // Default to GPT-3.5
  }

  // Execute query using the selected model
  public async runQuery(input: string): Promise<string> {
    const selectedModelName = await this.selectModel(input);
    const model = this.modelMap[selectedModelName];

    const response: AIMessageChunk = await model.invoke(input);

    return response.content as string; // Extract and return the actual message text
  }
}

export default AIService;
