from collections import deque


def topological_sort(graph, num_of_vertices):
    in_degree = {i: 0 for i in graph}

    for i in graph:
        for j in graph[i]:
            in_degree[j] += 1

    queue = deque()
    for i in graph:
        if in_degree[i] == 0:
            queue.append(i)

    cnt = 0
    top_order = []

    while queue:
        u = queue.popleft()
        top_order.append(u)

        for i in graph[u]:
            in_degree[i] -= 1
            if in_degree[i] == 0:
                queue.append(i)

        cnt += 1

    # Check if there was a cycle
    if cnt != num_of_vertices:
        raise Exception("There exists a cycle in the graph. Topological sorting is not possible.")
    else:
        return top_order
