import { walk } from '@swc-next/walker';
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
  walk<Node.Node, State, Node.Node>(
    node,
    {
      enter(child, context) {
        const visitor = visitors[child.type];
        if (visitor) {
          context.skip();
          visitor(child as never, context.state, (next, nextState) => {
            recursive(next, nextState, visitors);
          });
        }
      },
    },
    state,
  );
}
