import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessageChunk } from "@langchain/core/messages";

interface ModelWeights {
  complexity: number;
  speed: number;
  cost: number;
}

class AIService {
  private gpt35: ChatOpenAI;
  private gpt4: ChatOpenAI;
  private claude3Sonnet: ChatAnthropic;
  private claude3Haiku: ChatAnthropic;
  private modelSelectorChain: RunnableSequence;
  private modelMap: Record<string, ChatOpenAI | ChatAnthropic>;

  // Define model characteristics for weighted selection
  private modelWeights: Record<string, ModelWeights> = {
    gpt35: { complexity: 0.7, speed: 0.9, cost: 0.9 },
    gpt4: { complexity: 0.9, speed: 0.7, cost: 0.5 },
    claude3Sonnet: { complexity: 0.95, speed: 0.8, cost: 0.6 },
    claude3Haiku: { complexity: 0.7, speed: 0.95, cost: 0.8 },
  };

  constructor(
    private defaultModel: string = "claude3Sonnet",
    private useObjectiveSelection: boolean = true
  ) {
    // Initialize all properties in constructor to satisfy TypeScript
    this.gpt35 = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.5,
    });

    this.gpt4 = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.5,
    });

    this.claude3Sonnet = new ChatAnthropic({
      modelName: "claude-3-sonnet-20240229",
      temperature: 0.5,
    });

    this.claude3Haiku = new ChatAnthropic({
      modelName: "claude-3-haiku-20240229",
      temperature: 0.5,
    });

    this.modelMap = {
      gpt35: this.gpt35,
      gpt4: this.gpt4,
      claude3Sonnet: this.claude3Sonnet,
      claude3Haiku: this.claude3Haiku,
    };

    // Initialize modelSelectorChain
    const modelSelectorPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an objective model router that selects the most suitable AI model for a given query.
        Consider these factors:
        1. Query complexity and required reasoning
        2. Response speed requirements
        3. Cost efficiency needs
        
        Available models and their strengths:
        - gpt35: Fast, cost-effective, good for simple tasks
        - gpt4: Advanced reasoning, complex tasks
        - claude3Sonnet: Strong analysis, well-rounded performance
        - claude3Haiku: Fastest response, efficient for straightforward tasks
        
        Respond only with the model name, no explanation.`,
      ],
      ["human", "{input}"],
    ]);

    this.modelSelectorChain = RunnableSequence.from([
      modelSelectorPrompt,
      this.claude3Haiku,
      new StringOutputParser(),
    ]);
  }

  private analyzeQueryComplexity(input: string): ModelWeights {
    // Simplified complexity analysis
    const complexityIndicators = [
      input.length > 200,
      input.includes("analyze"),
      input.includes("explain"),
      input.includes("compare"),
    ];

    const speedIndicators = [
      input.includes("quickly"),
      input.includes("fast"),
      input.length < 100,
    ];

    const costIndicators = [
      input.includes("efficient"),
      input.includes("simple"),
      input.length < 50,
    ];

    return {
      complexity:
        complexityIndicators.filter(Boolean).length /
        complexityIndicators.length,
      speed: speedIndicators.filter(Boolean).length / speedIndicators.length,
      cost: costIndicators.filter(Boolean).length / costIndicators.length,
    };
  }

  private async selectModelObjectively(input: string): Promise<string> {
    const queryWeights = this.analyzeQueryComplexity(input);

    let bestModel = this.defaultModel;
    let bestScore = -1;

    for (const [modelName, weights] of Object.entries(this.modelWeights)) {
      const score =
        queryWeights.complexity * weights.complexity +
        queryWeights.speed * weights.speed +
        queryWeights.cost * weights.cost;

      if (score > bestScore) {
        bestScore = score;
        bestModel = modelName;
      }
    }

    return bestModel;
  }

  private async selectModel(input: string): Promise<string> {
    if (this.useObjectiveSelection) {
      return this.selectModelObjectively(input);
    }

    const selectedModelName = await this.modelSelectorChain.invoke({ input });
    return selectedModelName in this.modelMap
      ? selectedModelName
      : this.defaultModel;
  }

  public async runQuery(
    input: string,
    forceModel?: keyof typeof this.modelMap
  ): Promise<string> {
    const selectedModelName = forceModel || (await this.selectModel(input));
    const model = this.modelMap[selectedModelName];

    console.log(`Selected Model: ${selectedModelName}`);

    const response: AIMessageChunk = await model.invoke(input);
    return response.content as string;
  }

  public async *streamQuery(
    input: string,
    forceModel?: keyof typeof this.modelMap
  ): AsyncGenerator<string> {
    const selectedModelName = forceModel || (await this.selectModel(input));
    const model = this.modelMap[selectedModelName];

    console.log(`Selected Model: ${selectedModelName}`);

    // Get the streaming response
    const stream = await model.stream(input);

    // Iterate over chunks as they arrive
    for await (const chunk of stream) {
      yield chunk.content as string;
    }
  }
}

export default AIService;
