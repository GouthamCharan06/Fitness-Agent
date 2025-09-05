# backend/graph.py
from langgraph.graph import StateGraph, END
from .agents.trainer_agent import trainer_node
from .agents.nutrition_agent import nutrition_node
from .agents.recovery_agent import recovery_node
import logging

def build_graph(flow: list[str]):
    """
    Build a LangGraph dynamically based on requested flow.
    flow = list of agent names in execution order.
    Example: ["recovery", "trainer", "nutrition"]
             ["trainer"]
             ["trainer", "nutrition"]

    Adds a wrapper to ensure an agent is not executed more than once
    during a single query, preventing duplicate responses.
    """
    graph = StateGraph()
    
    # Internal wrapper to skip already visited agents
    def make_safe_node(agent_func, agent_name):
        async def safe_node(state, context):
            state.setdefault("visited_agents", set())
            if agent_name in state["visited_agents"]:
                logging.info(f"[Graph] Skipping {agent_name}, already executed")
                return state
            logging.info(f"[Graph] Executing {agent_name}")
            state["visited_agents"].add(agent_name)
            return await agent_func(state, context)
        return safe_node

    # Register available agent nodes with safe wrapper
    graph.add_node("trainer", make_safe_node(trainer_node, "trainer"))
    graph.add_node("nutrition", make_safe_node(nutrition_node, "nutrition"))
    graph.add_node("recovery", make_safe_node(recovery_node, "recovery"))

    # Wire edges according to requested flow
    for i in range(len(flow) - 1):
        graph.add_edge(flow[i], flow[i + 1])

    # Always end at the last node in flow
    graph.add_edge(flow[-1], END)

    return graph.compile()
