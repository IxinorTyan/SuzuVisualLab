import { NodeDefinition } from '../core/NodeDefinition';

export class NodeRegistry {
  private registry: Map<string, NodeDefinition> = new Map();

  register(definition: NodeDefinition): void {
    if (this.registry.has(definition.type)) {
      console.warn(`Node type "${definition.type}" is already registered. Overwriting.`);
    }
    this.registry.set(definition.type, definition);
  }

  get(type: string): NodeDefinition | undefined {
    return this.registry.get(type);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.registry.values());
  }

  getByCategory(category: string): NodeDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.registry.forEach((def) => categories.add(def.category));
    return Array.from(categories);
  }
}

const nodeRegistry = new NodeRegistry();

// === 自动注册所有节点 ===
import { registerInputNodes } from './nodes/inputNodes';
import { registerFilterNodes } from './nodes/filterNodes';
import { registerOutputNodes } from './nodes/outputNodes';

registerInputNodes(nodeRegistry);
registerFilterNodes(nodeRegistry);
registerOutputNodes(nodeRegistry);

export { nodeRegistry };
