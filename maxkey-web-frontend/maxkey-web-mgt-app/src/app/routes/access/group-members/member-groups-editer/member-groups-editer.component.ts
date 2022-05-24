import { ChangeDetectionStrategy, ViewContainerRef, ChangeDetectorRef, Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { _HttpClient } from '@delon/theme';
import { format, addDays } from 'date-fns';
import { NzSafeAny } from 'ng-zorro-antd/core/types';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

import { GroupMembersService } from '../../../../service/group-members.service';

@Component({
  selector: 'app-member-groups-editer',
  templateUrl: './member-groups-editer.component.html',
  styleUrls: ['./member-groups-editer.component.less']
})
export class MemberGroupsEditerComponent implements OnInit {
  @Input() username?: String;
  query: {
    params: {
      groupName: String;
      username: String;
      protocol: String;
      startDate: String;
      endDate: String;
      startDatePicker: Date;
      endDatePicker: Date;
      pageSize: number;
      pageNumber: number;
      pageSizeOptions: number[];
    };
    results: {
      records: number;
      rows: NzSafeAny[];
    };
    expandForm: Boolean;
    submitLoading: boolean;
    tableLoading: boolean;
    tableCheckedId: Set<String>;
    indeterminate: boolean;
    checked: boolean;
  } = {
      params: {
        groupName: '',
        username: '',
        protocol: '',
        startDate: '',
        endDate: '',
        startDatePicker: addDays(new Date(), -30),
        endDatePicker: new Date(),
        pageSize: 5,
        pageNumber: 1,
        pageSizeOptions: [5, 15, 50]
      },
      results: {
        records: 0,
        rows: []
      },
      expandForm: false,
      submitLoading: false,
      tableLoading: false,
      tableCheckedId: new Set<String>(),
      indeterminate: false,
      checked: false
    };

  constructor(
    private modalRef: NzModalRef,
    private groupMembersService: GroupMembersService,
    private viewContainerRef: ViewContainerRef,
    private fb: FormBuilder,
    private msg: NzMessageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.username) {
      this.query.params.username = this.username;
    }
    this.fetch();
  }

  onQueryParamsChange(tableQueryParams: NzTableQueryParams): void {
    this.query.params.pageNumber = tableQueryParams.pageIndex;
    this.query.params.pageSize = tableQueryParams.pageSize;
    this.fetch();
  }

  onSearch(): void {
    this.fetch();
  }

  onReset(): void { }

  fetch(): void {
    this.query.submitLoading = true;
    this.query.tableLoading = true;
    this.query.indeterminate = false;
    this.query.checked = true;
    this.query.tableCheckedId.clear();
    if (this.query.expandForm) {
      this.query.params.endDate = format(this.query.params.endDatePicker, 'yyyy-MM-dd HH:mm:ss');
      this.query.params.startDate = format(this.query.params.startDatePicker, 'yyyy-MM-dd HH:mm:ss');
    } else {
      this.query.params.endDate = '';
      this.query.params.startDate = '';
    }
    this.groupMembersService.groupsNoMember(this.query.params).subscribe(res => {
      this.query.results = res.data;
      this.query.submitLoading = false;
      this.query.tableLoading = false;
      this.cdr.detectChanges();
    });
  }

  updateTableCheckedSet(id: String, checked: boolean): void {
    if (checked) {
      this.query.tableCheckedId.add(id);
    } else {
      this.query.tableCheckedId.delete(id);
    }
  }

  refreshTableCheckedStatus(): void {
    const listOfEnabledData = this.query.results.rows.filter(({ disabled }) => !disabled);
    this.query.checked = listOfEnabledData.every(({ id }) => this.query.tableCheckedId.has(id));
    this.query.indeterminate = listOfEnabledData.some(({ id }) => this.query.tableCheckedId.has(id)) && !this.query.checked;
  }

  onTableItemChecked(id: String, checked: boolean): void {
    //this.onTableAllChecked(false);
    this.updateTableCheckedSet(id, checked);
    this.refreshTableCheckedStatus();
  }

  onTableAllChecked(checked: boolean): void {
    this.query.results.rows.filter(({ disabled }) => !disabled).forEach(({ id }) => this.updateTableCheckedSet(id, checked));
    this.refreshTableCheckedStatus();
  }

  onSubmit(e: MouseEvent): void {
    e.preventDefault();
    const listOfEnabledData = this.query.results.rows.filter(({ disabled }) => !disabled);
    let selectedData = listOfEnabledData.filter(({ id, name }) => {
      return this.query.tableCheckedId.has(id);
    });
    let groupIds = '';
    let groupNames = '';
    for (let i = 0; i < selectedData.length; i++) {
      groupIds = `${groupIds},${selectedData[i].id}`;
      groupNames = `${groupNames},${selectedData[i].name}`;
    }
    this.groupMembersService.addMember2Groups({ username: this.username, groupId: groupIds, groupName: groupNames }).subscribe(res => {
      this.query.results = res.data;
      this.query.submitLoading = false;
      this.query.tableLoading = false;
      if (res.code == 0) {
        this.msg.success(`提交成功`);
        this.fetch();
      } else {
        this.msg.success(`提交失败`);
      }
      this.cdr.detectChanges();
    });
  }

  onClose(e: MouseEvent): void {
    e.preventDefault();
  }
}
