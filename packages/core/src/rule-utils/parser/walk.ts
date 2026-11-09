import { createWalker, type WalkHandler } from '@swc-next/walker';
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
  const hooks: Partial<
    Record<Node.Node['type'], WalkHandler<Node.Node, State>>
  > = {};
  for (const type of Object.keys(visitors) as Node.Node['type'][]) {
    const visitor = visitors[type];
    if (visitor) {
      hooks[type] = (child, context) => {
        context.skip();
        visitor(child as never, context.state, visit);
      };
    }
  }

  const walker = createWalker<State, Node.Node>(hooks);
  function visit(child: Node.Node, childState: State) {
    walker.walk(child, childState);
  }
  visit(node, state);
}
