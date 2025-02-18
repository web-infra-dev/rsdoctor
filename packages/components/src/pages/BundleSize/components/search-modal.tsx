import React, { useCallback, useState } from 'react';
import { Button, Modal, Input, Tabs, List, Skeleton, Typography } from 'antd';
import { SearchProps } from 'antd/es/input';
import { ServerAPIProvider } from 'src/components';
import { SDK } from '@rsdoctor/types';
import styles from './index.module.scss';

const { Search } = Input;

type OnSearchParams = Parameters<NonNullable<SearchProps['onSearch']>>;

export const SearchModal: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchModule, setSearchModule] = useState('');
  const [searchChunk, setSearchChunk] = useState('');

  const onSearch: SearchProps['onSearch'] = useCallback(
    (...args: OnSearchParams) => {
      const [value, _event] = args;
      setSearchModule(value);
    },
    [],
  );

  const showModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Button className={styles['search-btn']} color="cyan" onClick={showModal}>
        Search Module
      </Button>

      <ServerAPIProvider
        api={SDK.ServerAPI.API.GetSearchModules}
        body={{ moduleName: String(searchModule) }}
      >
        {(assetsChunksList) => {
          const defaultChunkId = Object.keys(assetsChunksList)[0];
          return (
            <>
              <Modal title="Search Modules" open={isModalOpen} width={700}>
                <Search
                  placeholder="input search module name"
                  allowClear
                  onSearch={onSearch}
                  style={{ width: 500 }}
                />
                {
                  <Tabs
                    defaultActiveKey={defaultChunkId}
                    tabPosition={'top'}
                    onChange={(value) => setSearchChunk(value)}
                    items={Object.keys(assetsChunksList).map((chunk, _i) => {
                      const id = chunk;
                      return {
                        label: assetsChunksList[chunk],
                        key: id,
                        children: ModulesModal(
                          searchModule,
                          searchChunk || defaultChunkId,
                        ),
                      };
                    })}
                  />
                }
              </Modal>
            </>
          );
        }}
      </ServerAPIProvider>
    </>
  );
};

const ModulesModal = (searchModule: string, chunk: string) => {
  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetSearchModuleInChunk}
      body={{ moduleName: String(searchModule), chunk }}
    >
      {(modules) => (
        <div>
          {
            <>
              <List
                className="search-modules-list"
                loading={!modules.length}
                itemLayout="horizontal"
                pagination={{ position: 'bottom', align: 'center' }}
                dataSource={modules}
                renderItem={(item) => (
                  <List.Item>
                    <Skeleton avatar title={false} loading={!item.path} active>
                      <List.Item.Meta
                        description={
                          <>
                            <Typography.Text code>{'Module:'}</Typography.Text>
                            {`${item.relativePath}`}
                          </>
                        }
                      />
                    </Skeleton>
                  </List.Item>
                )}
              />
            </>
          }
        </div>
      )}
    </ServerAPIProvider>
  );
};
