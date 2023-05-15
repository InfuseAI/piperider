import { SidebarTreeItem } from '../../utils/dbt';
import React, { useState } from 'react';
import { List, ListItem, ListIcon, Text, Flex } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { FaChartBar, FaFile } from 'react-icons/fa';
import { getIconForColumnType } from '..';
import { FiDatabase, FiFolder, FiGrid } from 'react-icons/fi';
import { FiChevronDown, FiChevronRight, FiCheckCircle } from 'react-icons/fi';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import { Comparable } from '../../types';

interface Props extends Comparable {
  items?: SidebarTreeItem[];
}

export function SideBarTree({ items, singleOnly }: Props) {
  const [, setCounter] = useState(0);
  const [location, setLocation] = useLocation();

  if (!items) {
    return <></>;
  }

  const onClick = (item: SidebarTreeItem) => {
    if (item.items && item.items.length > 0) {
      item.expanded = !item.expanded;
      setCounter((c) => c + 1);
    }

    if (item.path) {
      setLocation(item.path);
    }
  };

  const renderItem = (item: SidebarTreeItem) => {
    const { type, name, items } = item;

    if (item.type === 'folder') {
      if (!item.items || item.items.length === 0) {
        return;
      }
    }

    const isExpanded = !!item.expanded;
    const isExpandable = items && items.length > 0;
    const iconChevron = isExpanded ? FiChevronDown : FiChevronRight;
    let iconChangeStatus;
    if (item.changeStatus === 'added') {
      iconChangeStatus = VscDiffAdded;
    } else if (item.changeStatus === 'changed') {
      iconChangeStatus = VscDiffModified;
    } else if (item.changeStatus === 'removed') {
      iconChangeStatus = VscDiffRemoved;
    }

    let icon = FiFolder;
    if (
      type === 'model' ||
      type === 'table' ||
      type === 'source' ||
      type === 'seed'
    ) {
      icon = FiGrid;
    } else if (type.startsWith('database')) {
      icon = FiDatabase;
    } else if (type.startsWith('schema')) {
      icon = FiFolder;
    } else if (type.startsWith('column_')) {
      const columnType = type.slice('column_'.length);
      icon = getIconForColumnType(columnType).icon;
    } else if (
      type === 'metric' ||
      type === 'metric_list' ||
      type === 'analysis'
    ) {
      icon = FaChartBar;
    } else if (type === 'test_list') {
      icon = FiCheckCircle;
    } else if (type === 'exposure') {
      icon = FaFile;
    }
    const isActive = item.path === location;

    return (
      <ListItem key={name}>
        <Flex
          _hover={{ bg: isActive ? 'piperider.400' : 'gray.100' }}
          rounded="md"
          cursor="pointer"
          fontSize="sm"
          color={isActive ? 'white' : 'inherit'}
          bg={isActive ? 'piperider.400' : 'inherit'}
          onClick={() => {
            onClick(item);
          }}
          alignItems="center"
          px={2}
        >
          <ListIcon
            as={iconChevron}
            visibility={isExpandable ? 'visible' : 'hidden'}
          />
          <ListIcon as={icon} mr={1} />
          <Text flex={1}>{name}</Text>
          {!singleOnly && item.changeStatus && (
            <ListIcon as={iconChangeStatus} />
          )}
        </Flex>
        {isExpanded && items && items.length > 0 && (
          <List ml={4} spacing={1} my={1}>
            {items.map((child) => renderItem(child))}
          </List>
        )}
      </ListItem>
    );
  };

  return <List spacing={2}>{items.map((item) => renderItem(item))}</List>;
}
