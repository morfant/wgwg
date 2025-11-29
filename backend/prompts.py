from typing import Sequence

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


def build_translator_prompt(translator_instructions: str) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", translator_instructions),
            ("human", "the material to tranlate: {message}"),
        ]
    )


def build_host_prompt(
    host_instructions: str,
    members: Sequence[str],
    persona: str,
    venue: str = "",
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", host_instructions),
            ("system", "The following AI agents are engaged in a debate: {members}."),
            ("human", "the feedback about the current debate from critic agent: {feedback}"),
            ("human", "comment provided by the user on the debate: {user_comment}"),
            ("human", "The debate topic is as follows {topic}."),
            (
                "human",
                "The variable 'topic_changed' is {topic_changed}. If True, acknowledge the topic change and introduce the new topic {topic}.",
            ),
            (
                "human",
                "The variable 'debate_end' is {debate_end}. If True, please provide a concise summary of the key points discussed by the AI agents, highlighting any agreements and disagreements. Then, conclude the debate by reflecting on the importance of the topics covered.",
            ),
            MessagesPlaceholder(variable_name="messages"),
        ]
    ).partial(members=str(members), persona=persona, venue=venue)


def build_critic_prompt(
    critic_instructions: str,
    topic: str,
    members: Sequence[str],
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", critic_instructions),
            ("system", "The debate topic is as follows :{topic}."),
            ("system", "The following AI agents are engaged in a debate: {members}."),
            ("human", "the current situatin of the debate: {debate}"),
            ("human", "you are giving a advice to : {participant}"),
        ]
    ).partial(topic=topic, members=str(members))


def build_debate_agent_prompt_01(
    system_instructions: str,
    topic: str,
    members: Sequence[str],
    persona: str,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "The debate topic is as follows {topic}."),
            ("system", system_instructions),
            ("human", "the feedback about the current debate from critic agent: {feedback}"),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "The following AI agents are engaged in a debate: {members}."),
        ]
    ).partial(members=str(members), topic=topic, name=members[0], persona=persona)


def build_debate_agent_prompt_02(
    system_instructions: str,
    topic: str,
    members: Sequence[str],
    persona: str,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "The debate topic is as follows {topic}."),
            ("system", system_instructions),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "The following AI agents are engaged in a debate: {members}."),
        ]
    ).partial(members=str(members), topic=topic, name=members[1], persona=persona)


def build_debate_agent_prompt_03(
    system_instructions: str,
    topic: str,
    members: Sequence[str],
    persona: str,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "The debate topic is as follows {topic}."),
            ("system", system_instructions),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "The following AI agents are engaged in a debate: {members}."),
        ]
    ).partial(members=str(members), topic=topic, name=members[2], persona=persona)


def build_debate_agent_prompt_04(
    system_instructions: str,
    topic: str,
    members: Sequence[str],
    persona: str,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "The debate topic is as follows {topic}."),
            ("system", "your name is {name}."),
            ("system", system_instructions),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "The following AI agents are engaged in a debate: {members}."),
        ]
    ).partial(members=str(members), topic=topic, name=members[3], persona=persona)


def build_debate_agent_prompt_05(
    system_instructions: str,
    topic: str,
    members: Sequence[str],
    persona: str,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "The debate topic is as follows {topic}."),
            ("system", "your name is {name}."),
            ("system", system_instructions),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "The following AI agents are engaged in a debate: {members}."),
        ]
    ).partial(members=str(members), topic=topic, name=members[4], persona=persona)


def build_debate_agent_prompt_06(
    system_instructions: str,
    topic: str,
    members: Sequence[str],
    persona: str,
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", "The debate topic is as follows {topic}."),
            ("system", "your name is {name}."),
            ("system", system_instructions),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "The following AI agents are engaged in a debate: {members}."),
        ]
    ).partial(members=str(members), topic=topic, name=members[5], persona=persona)


def build_punchliner_prompt(
    punchline_instructions: str,
    topic: str,
    members: Sequence[str],
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", punchline_instructions),
            ("system", "The debate topic is as follows :{topic}."),
            ("system", "The following AI agents are engaged in a debate: {members}."),
            ("human", "the words you are going to work on: {words}"),
            ("human", "you are doing your job for : {participant}"),
        ]
    ).partial(topic=topic, members=str(members))


def build_simplifier_prompt(
    simplify_instructions: str,
    topic: str,
    members: Sequence[str],
) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", simplify_instructions),
            ("system", "The debate topic is as follows :{topic}."),
            ("system", "The following AI agents are engaged in a debate: {members}."),
            ("human", "the words you are going to work on: {words}"),
            ("human", "you are doing your job for : {participant}"),
        ]
    ).partial(topic=topic, members=str(members))

