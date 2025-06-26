import React, { useCallback, useState } from 'react';
import {
  Button,
  Modal,
  Input,
  Tabs,
  List,
  Skeleton,
  Typography,
  Empty,
} from 'antd';
import { SearchProps } from 'antd/es/input';
import { ServerAPIProvider } from 'src/components';
import { SDK } from '@rsdoctor/types';
import styles from './index.module.scss';
import { SearchOutlined } from '@ant-design/icons';

const { Search } = Input;

type OnSearchParams = Parameters<NonNullable<SearchProps['onSearch']>>;

export const SearchModal: React.FC<{
  onModuleClick?: (module: any) => void;
  onClose?: () => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  isIcon?: boolean;
}> = ({
  onModuleClick = undefined,
  onClose,
  open,
  setOpen,
  isIcon = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchModule, setSearchModule] = useState('');
  const [searchChunk, setSearchChunk] = useState('');

  const modalOpen = open !== undefined ? open : isModalOpen;
  const setModalOpen = setOpen || setIsModalOpen;

  const onSearch: SearchProps['onSearch'] = useCallback(
    (...args: OnSearchParams) => {
      const [value, _event] = args;
      setSearchModule(value);
    },
    [],
  );

  const showModal = () => {
    setModalOpen(true);
  };

  const handleOk = () => {
    setModalOpen(false);
    onClose?.();
  };

  const handleCancel = () => {
    setModalOpen(false);
    onClose?.();
  };

  return (
    <>
      {isIcon ? (
        <SearchOutlined onClick={showModal} />
      ) : (
        <Button
          className={styles['search-btn']}
          color="cyan"
          onClick={showModal}
        >
          Search Module
        </Button>
      )}

      <ServerAPIProvider
        api={SDK.ServerAPI.API.GetSearchModules}
        body={{ moduleName: String(searchModule) }}
      >
        {(assetsChunksList) => {
          const defaultChunkId = Object.keys(assetsChunksList)[0];
          return (
            <>
              <Modal
                className={styles.modal}
                title="Search Modules"
                onOk={handleOk}
                onCancel={handleCancel}
                open={modalOpen}
                width={'65rem'}
                footer=""
              >
                <Search
                  placeholder="input search module name"
                  allowClear
                  onSearch={onSearch}
                  style={{ width: 500 }}
                />
                {defaultChunkId ? (
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
                          (item) => {
                            onModuleClick?.(item);
                            setModalOpen(false);
                            onClose?.();
                          },
                        ),
                      };
                    })}
                  />
                ) : (
                  <Empty description={'No modules found.'} />
                )}
              </Modal>
            </>
          );
        }}
      </ServerAPIProvider>
    </>
  );
};

const ModulesModal = (
  searchModule: string,
  chunk: string,
  onModuleClick?: (module: any) => void | undefined,
) => {
  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetSearchModuleInChunk}
      body={{ moduleName: String(searchModule), chunk }}
    >
      {(modules) => (
        <>
          {modules?.length !== 0 ? (
            <List
              className={styles['search-modal-list']}
              loading={!modules.length}
              itemLayout="horizontal"
              pagination={{ position: 'bottom', align: 'center' }}
              dataSource={modules}
              renderItem={(item) => {
                const itemPathArr = item.relativePath.split(searchModule);
                return (
                  <List.Item
                    className={
                      onModuleClick
                        ? 'search-list-item clickable'
                        : 'search-list-item'
                    }
                    onClick={
                      onModuleClick ? () => onModuleClick(item) : undefined
                    }
                  >
                    <Skeleton avatar title={false} loading={!item.path} active>
                      <List.Item.Meta
                        description={
                          <>
                            <Typography.Text code>{'Module:'}</Typography.Text>
                            {itemPathArr.map((cur, index) => {
                              if (index < itemPathArr.length - 1) {
                                return (
                                  <Typography.Text style={{ fontWeight: 200 }}>
                                    {cur}
                                    <Typography.Text
                                      strong
                                      style={{ fontWeight: 600 }}
                                    >
                                      {searchModule}
                                    </Typography.Text>
                                  </Typography.Text>
                                );
                              }
                              return (
                                <Typography.Text style={{ fontWeight: 200 }}>
                                  {cur}
                                </Typography.Text>
                              );
                            })}
                          </>
                        }
                      />
                    </Skeleton>
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty />
          )}
        </>
      )}
    </ServerAPIProvider>
  );
};
