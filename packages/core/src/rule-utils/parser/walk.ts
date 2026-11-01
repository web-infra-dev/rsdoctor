import { walk } from 'estree-walker';
import type { Node } from './types';

type Visitors<State> = {
  [Type in Node.Node['type']]?: (
    node: Extract<Node.Node, { type: Type }>,
    state: State,
    visit: (node: Node.Node, state: State) => void,
  ) => void;
};

/** Visitors control descent; unhandled node types traverse their children. */
export function recursive<State>(
  node: Node.Node,
  state: State,
  visitors: Visitors<State>,
): void {
  // estree-walker uses a newer ESTree declaration with required import attributes.
  walk(node as Parameters<typeof walk>[0], {
    enter(child) {
      const visitor = visitors[child.type];
      if (visitor) {
        this.skip();
        visitor(child as never, state, (next, nextState) => {
          recursive(next, nextState, visitors);
        });
      }
    },
  });
}
