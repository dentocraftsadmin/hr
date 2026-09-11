-- The original leave_types seed (20260904152159) included an "Earned"
-- type with an annual_quota, implying an accrued/earned-leave balance
-- system. The company's actual policy has no earned/paid/PTO/balance
-- concept -- leave is either informed (no score impact) or not, per the
-- notice-period rule (20260911130000). Casual and Sick remain as plain
-- leave-type categories; annual_quota on those rows is simply unused going
-- forward rather than dropped, to avoid an unnecessary destructive schema
-- change for a column two rows still have populated with harmless values.
delete from leave_types where name = 'Earned';
