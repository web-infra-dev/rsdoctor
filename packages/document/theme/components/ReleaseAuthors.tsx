import { BlogAvatarGroup } from '@rstackjs/doc-ui/blog-avatar';
import { yifancong } from './blogAuthors';

export function ReleaseAuthors() {
  return <BlogAvatarGroup authors={[yifancong]} compact />;
}
