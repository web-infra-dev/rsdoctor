import { get } from 'lodash-es';
import { Common, SDK } from '@rsdoctor/types';
import { message, Space, TreeNodeProps, UploadFile } from 'antd';
import { FieldDataNode } from 'rc-tree';
import {
  FolderOpenTwoTone,
  FolderTwoTone,
  FileOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { getFileCom } from 'src/components/FileTree';

export type DataNode = FieldDataNode<{
  key: string | number;
  title?: React.ReactNode | ((data: DataNode) => React.ReactNode);
}> & { __BASENAME__?: any; __RESOURCEPATH__?: any; children?: DataNode[] };

export const rootDirname = (file: string, sep = '/'): string | null => {
  const idx = file?.indexOf(sep);
  if (idx === -1) {
    return null;
  }
  if (idx === 0) {
    return sep + (rootDirname(file?.slice(1)) || '');
  }
  return file?.slice(0, idx);
};

export function mapFileKey(
  arr: DataNode[],
  depth = 2,
  filter: (node: DataNode) => boolean = () => true,
): DataNode['key'][] {
  let d = 0;
  const res: DataNode['key'][] = [];
  let parent: DataNode[] = arr;
  while (d < depth) {
    parent.filter(filter).forEach((e) => {
      if (!e.isLeaf) {
        res.push(e.key);
      }
    });
    parent = parent.reduce<DataNode[]>(
      (t, e) => t.concat(e.children || []),
      [],
    );
    if (!parent.length) break;
    d++;
  }
  return res;
}

const basenameKey = '__BASENAME__';

export function flattenDirectory(
  n: DataNode,
  parent: DataNode,
  sep = '/',
  inlinedResourcePathKey: keyof DataNode,
  dirTitle = (_dir: DataNode, defaultTitle: string): JSX.Element | string =>
    defaultTitle,
) {
  if (n.isLeaf) return;
  if (parent.children && parent.children.length === 1) {
    const defaultTitle = [parent[basenameKey], n[basenameKey]].join(sep);
    parent[inlinedResourcePathKey] = n[inlinedResourcePathKey];
    parent[basenameKey] = defaultTitle;
    parent.key = [parent.key, n.key].join('-');
    parent.children = n.children;
    parent.title = dirTitle(parent, defaultTitle);

    n.children &&
      n.children.forEach((c) => {
        flattenDirectory(c, parent, sep, inlinedResourcePathKey, dirTitle);
      });
  } else {
    // parent has more than 1 child.
    n.title = dirTitle(n, n[basenameKey]);

    n.children &&
      n.children.forEach((c) => {
        flattenDirectory(c, n, sep, inlinedResourcePathKey, dirTitle);
      });
  }
}

export function createFileStructures({
  files,
  sep = '/',
  inlinedResourcePathKey = '__RESOURCEPATH__',
  fileTitle = (_file: string, basename: string) => basename,
  dirTitle = (_dir: DataNode, defaultTitle: string) => defaultTitle,
  page = 'other',
}: {
  files: string[];
  cwd?: string;
  sep?: string;
  inlinedResourcePathKey?: keyof DataNode;
  dirTitle?(dir: DataNode, defaultTitle: string): JSX.Element | string;
  fileTitle?(file: string, basename: string): JSX.Element | string;
  page?: 'bundle' | 'other';
}): DataNode[] {
  const sepRegexp = new RegExp(sep);

  const res = files.reduce<DataNode>(
    (t, file) => {
      let dir = rootDirname(file, sep);
      let basename = dir ? file?.slice(dir.length + 1) : file;
      let parent: DataNode = t;

      while (dir) {
        // find the match directory.
        let exist = parent.children!.find((e) => e.title === dir) as DataNode;
        if (!exist) {
          const p = [parent[inlinedResourcePathKey], dir]
            .filter(Boolean)
            .join(sep);
          exist = {
            title: dir,
            icon:
              page === 'bundle'
                ? (props) => getFileIcon(props as TreeNodeProps, false)
                : null,
            // key: [parent.key, parent.children!.length].join('-'),
            key: p,
            children: [],
            [inlinedResourcePathKey]: p,
            [basenameKey]: dir,
          };
          parent.children!.push(exist);
        }

        parent = exist;
        dir = rootDirname(basename);
        basename = dir
          ? basename.slice(dir.length).replace(sepRegexp, '')
          : basename;
      }

      // uniq
      if (parent.children!.some((e) => get(e, inlinedResourcePathKey) === file))
        return t;

      parent.children!.push({
        title() {
          return fileTitle(file, basename);
        },
        icon:
          page === 'bundle'
            ? (props) => getFileIcon(props as TreeNodeProps)
            : null,
        key: file,
        isLeaf: true,
        [inlinedResourcePathKey]: file,
        [basenameKey]: basename,
      });

      return t;
    },
    { key: '0', children: [] },
  ).children!;

  res.forEach((e) => {
    e.children &&
      e.children.forEach((item) =>
        flattenDirectory(item, e, sep, inlinedResourcePathKey, dirTitle),
      );
  });

  return res;
}

export function beautifyPath(path: string, cwd: string) {
  if (path.startsWith(cwd)) {
    return path.replace(cwd, '.');
  }

  return path;
}

export function readJSONByFileReader<T extends Common.PlainObject>(
  file: UploadFile,
): Promise<T>;
export function readJSONByFileReader<T extends Common.PlainObject>(
  file: Blob,
): Promise<T>;
export function readJSONByFileReader<T extends Common.PlainObject>(
  file: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const { result } = reader;
      console.log('reader result: ', result);
      try {
        const json = JSON.parse(result!.toString());
        resolve(json);
      } catch (err) {
        message.error('json parse error');
        reject(err);
      }
    };
    reader.onerror = () => {
      const msg = 'upload json file error, please try again.';
      message.error(msg);
      reject(new Error(msg));
    };
    reader.readAsText(((file as UploadFile).originFileObj || file) as Blob);
  });
}

/**
 * beautify module path, will replace cwd & last 'node_modules'
 */
export function beautifyModulePath(modulePath: string, cwd: string) {
  const res = beautifyPath(modulePath, cwd);

  const str = '/node_modules/';

  const idx = res.lastIndexOf(str);

  if (idx > -1) {
    return {
      alias: res.slice(idx + str.length),
      inNodeModules: true,
    };
  }

  return {
    alias: res,
    inNodeModules: false,
  };
}

export function getFileIcon(props: TreeNodeProps, addRowIcon = true) {
  const { data } = props;
  const expanded = props.expanded;
  if (data?.children) {
    return (
      <Space>
        {addRowIcon ? (
          <RightOutlined
            className={`file-tree-switcher-arrow ${expanded ? 'file-tree-switcher-arrow-expand' : ''}`}
          />
        ) : (
          <></>
        )}
        {expanded ? <FolderOpenTwoTone /> : <FolderTwoTone />}
      </Space>
    );
  }
  if (props.eventKey && typeof props.eventKey === 'string') {
    return getFileCom(props.eventKey);
  }
  return <FileOutlined />;
}

type TreeNode = {
  name: string;
  value?: number;
  children?: TreeNode[];
  path?: string;
  sourceSize?: number;
  bundledSize?: number;
  gzipSize?: number;
  // Internal helper, not exported
  _map?: Map<string, TreeNode>;
};

export function buildTreemapData(
  modules: SDK.ModuleData[],
  rootName = 'dist',
): TreeNode {
  const root: TreeNode = { name: rootName, children: [], _map: new Map() };

  for (const mod of modules) {
    const parts = mod.path.split(/[\\/]/).filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // File node
        if (!current.children) current.children = [];
        current.children.push({
          name: part,
          path: mod.path,
          sourceSize: mod.size?.sourceSize ?? 0,
          bundledSize: mod.size?.parsedSize ?? 0,
          gzipSize: mod.size?.gzipSize ?? 0,
        });
      } else {
        // Directory node
        if (!current._map) current._map = new Map();
        let child = current._map.get(part);
        if (!child) {
          child = { name: part, children: [], _map: new Map() };
          current.children!.push(child);
          current._map.set(part, child);
        }
        current = child;
      }
    }
  }

  // Clean up _map property
  function clean(node: TreeNode) {
    delete node._map;
    if (node.children) node.children.forEach(clean);
  }
  clean(root);

  return root;
}

function flattenSingleChildDirs(node: TreeNode): TreeNode {
  // Return directly if leaf node
  if (!node.children || node.children.length === 0) return node;

  let current = node;
  // As long as children has only one child and it's not a leaf, merge
  while (
    current.children &&
    current.children.length === 1 &&
    !current.children[0].sourceSize // Not a leaf
  ) {
    current = {
      name: current.name + '/' + current.children[0].name,
      children: current.children[0].children,
    };
  }

  // Recursively process all child nodes
  if (current.children) {
    current.children = current.children.map(flattenSingleChildDirs);
  }
  return current;
}

function sumDirValue(node: TreeNode): {
  sourceSize: number;
  bundledSize: number;
  gzipSize: number;
} {
  if (!node.children || node.children.length === 0) {
    // Leaf node, just return value
    return {
      sourceSize: node.sourceSize ?? 0,
      bundledSize: node.bundledSize ?? 0,
      gzipSize: node.gzipSize ?? 0,
    };
  }
  // Recursively sum all child nodes
  let sourceSum = 0;
  let bundledSum = 0;
  let gzipSum = 0;
  for (const child of node.children) {
    const { sourceSize, bundledSize, gzipSize } = sumDirValue(child);
    sourceSum += sourceSize;
    bundledSum += bundledSize;
    gzipSum += gzipSize;
  }
  node.sourceSize = sourceSum;
  node.bundledSize = bundledSum;
  node.gzipSize = gzipSum;
  return { sourceSize: sourceSum, bundledSize: bundledSum, gzipSize: gzipSum };
}

export function flattenTreemapData(
  modules: SDK.ModuleData[],
  rootName = 'dist',
): TreeNode {
  const rawTree = buildTreemapData(modules, rootName);
  const flattenedTree = flattenSingleChildDirs(rawTree);
  sumDirValue(flattenedTree); // Recursive sum
  return flattenedTree;
}
