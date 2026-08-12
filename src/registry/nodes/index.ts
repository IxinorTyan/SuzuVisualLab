import { nodeRegistry } from '../nodeRegistry';
import { registerInputNodes } from './inputNodes';
import { registerFilterNodes } from './filterNodes';
import { registerOutputNodes } from './outputNodes';

registerInputNodes(nodeRegistry);
registerFilterNodes(nodeRegistry);
registerOutputNodes(nodeRegistry);
