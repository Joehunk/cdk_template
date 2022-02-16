# Test for AWS SQS Lambda concurrency

Concurrency in non-FIFO SQS queues is a little nuts, in that Lambda (behind the scenes with no ability to configure) spawns
5 parallel workers that long poll the SQS queue and shovel the messages to your SQS Lambdas. This can go up (to a max of
the concurrency limit for the Lambda or AWS account) under load, but will never go below 5 EVEN IF the concurrency limit
for the Lambda itself is lower than 5. So while it may be tempting to serialize processing of non-FIFO SQS events by
setting concurrency of the Lambda to 1, while this does properly serialize, it means that 4 of the 5 hidden workers
are trying to call your Lambda and getting errors, and if this exceeds the visibility timeout to the queue, then
the messages will end up in the DLQ even though your Lambda never threw an error.

TLDR: behind the scenes funkiness will cause your SQS elements to end up in the DLQ for reasons you cannot track
or diagnose if your SQS queue is under load and your Lambda's concurrency is less than 5. The formula for this is
probably calculable as a function of SQS batch size/window, average processing time of the Lambda, actual Lambda
concurrency, etc. but rather than try to hash that out, let's just realize Lambda/SQS was not meant to process things
serially and stop trying to get it to.

Other options:

**FIFO Topics And Queues**
By default FIFO queues are serialized, and they also have the ability to specify a messageGroupId that functions like
a Kafka partition key. Different message group IDs will be processed in parallel but messages with the same group ID
will be processed in series. The behind the scenes funkiness above does not apply to FIFO queues.

The main limitation is throughput. FIFO SNS topics are 300 TPS, and FIFO queues are 300 TPS single or 3000 batched.
This means that to use them for DDB streams for instance, we need to ensure that TPS limit is respected. Here is an idea
I had for that:

DDB streams are Kinesis under the hood, with one shard per DDB partition. This ensures that you can safely process messages
from the different shards in parallel, which is what happens by default when you hook a Lambda to a Kinesis stream. And also
by default Kinesis only polls a couple times a second (0.2s is the fastest it will go, 1s is the default). But DDB
partitions are an opaque concept so it's impossible to control how many shards the underlying stream will have. If you have
more than 300 shards polling 1/sec then you can exceed SNS FIFO's limit.

However, Kinesis and DDB streams support a batching window so you can increase the poll time to up to 300s https://aws.amazon.com/about-aws/whats-new/2019/09/aws-lambda-now-supports-custom-batch-window-for-kinesis-and-dynamodb-event-sources/

In theory as long as the polling interval is at least as slow as 1s * number of shards / 300 then you should stay under 300 TPS to
SNS, and Kinesis will batch for you. All you have to do is monitor your consumer lag, which will start to fall behind if
your polling interval is too fast. The challenge here is the number of shards is not known, so you have to observe and
guess.

**Slow Polling Lambda**
Instead of using a Lambda SQS trigger, you can use either CloudWatch time triggers, or SQS delayed messages to create a
"tick" that triggers a Lambda that manually pulls from SQS. The Lambda could even reschedule itself to avoid e.g. concerns
with taking longer than a single tick to complete. The disadvantage here is that you have to pick a polling interval that
also becomes your best case latency. With a Lambda SQS trigger that uses long polling (basically a blocking HTTP call)
it will wake up immediately, but trying to replicate that in a Lambda could be expensive since you are paying for the time
to sit there and wait for a call. However an important advantage is you can use non-FIFO SNS/SQS and leverage the fact
that a key-only publish mechanism is robust against reordering, you can squash messages with the same key in a batch,
etc.

**Listen directly to the Stream**
This approach was abandoned early on and is in fact advised against in the official AWS best practices. It has several problems:

1. Kinesis has a global max polling rate that must be shared among multiple clients and is is not especially fast (5x/sec)
1. ARNs of DDB streams are unstable and have date stamps in them making them hard to share between CFN stacks and impossible to calculate.
1. Since Kinesis/DDB streams have no notion of log compaction and only have a 24 hour tail, you need to implement redrives yourself. No just setting the consumer offset to zero anymore. And if you listen directly to Kinesis, you must redrive at the producer (eg by setting a dummy column) which redrives all consumers and may be undesirable.

**Reshuffle Using A "Private" Kinesis Stream**
This approach is basically DDB stream -> Lambda -> SNS -> SQS -> Lambda -> (SQS FIFO | Kinesis) -> Final Lambda.

The idea is that by piping the SQS messages through Kinesis, you are re-partitioning the data by using the key of the DDB message as the partition key.
Perhaps you can get better cost at a specific latency target than the slow-polling approach above since you can still leverage long polling.
However this approach is much more complex than slow polling, and even polling an SQS queue once a second is only about $15 a year.
If you need better than 1s latency it's possible DDB streams is the wrong technology anyway and that you should be looking into something
like a KTable on Kafka.