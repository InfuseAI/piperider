import { SidebarTreeItem } from '../../utils/dbt';
import React, { useState } from 'react';
import { List, ListItem, ListIcon, Text, Flex } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { FaChartBar, FaFile, FaHome } from 'react-icons/fa';
import { getIconForColumnType } from '..';
import { FiDatabase, FiFolder, FiGrid } from 'react-icons/fi';
import { FiChevronDown, FiChevronRight, FiCheckCircle } from 'react-icons/fi';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import { Comparable } from '../../types';
import { IconImplicit } from '../Icons';

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

  const isChildrenChanged = (item: SidebarTreeItem) => {
    for (const child of item?.items ?? []) {
      if (child.changeStatus) {
        return true;
      }

      if (isChildrenChanged(child)) {
        return true;
      }
    }
    return false;
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
    let changeStatus = item.changeStatus;
    let isNoProfile = false;

    if (changeStatus === 'added') {
      iconChangeStatus = VscDiffAdded;
    } else if (changeStatus === 'removed') {
      iconChangeStatus = VscDiffRemoved;
    } else if (changeStatus === 'changed') {
      iconChangeStatus = VscDiffModified;
    } else if (changeStatus === 'implicit') {
      iconChangeStatus = IconImplicit;
    }

    if (!isExpanded && !changeStatus && isChildrenChanged(item)) {
      // If the item is not expanded and has children that are changed, then
      // we want to show the changed icon.
      changeStatus = 'changed';
      iconChangeStatus = VscDiffModified;
    }

    let icon = FiFolder;
    if (
      type === 'model' ||
      type === 'table' ||
      type === 'source' ||
      type === 'seed'
    ) {
      icon = FiGrid;
      isNoProfile = (item.items ?? []).length === 0;
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
    } else if (type === 'overview') {
      icon = FaHome;
    }

    const isActive = item.path === location;

    return (
      <ListItem key={name}>
        <Flex
          _hover={{ bg: isActive ? 'piperider.400' : 'gray.100' }}
          rounded="md"
          cursor="pointer"
          fontSize="sm"
          color={isActive ? 'white' : isNoProfile ? 'gray' : 'inherit'}
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
          {!singleOnly && changeStatus && <ListIcon as={iconChangeStatus} />}
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
